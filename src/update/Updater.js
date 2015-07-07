import Immutable from 'immutable';
import Analyser from 'circuit-analysis';
import {Functions} from 'circuit-models';
import R from 'ramda';

import EventProcessor from './EventProcessor.js';
import Modes from './Modes.js';
import Executor from './Executor.js';
import Wire from '../components/elements/Wire.jsx';

const {stamp} = Functions;

function viewModelChanged(state1, state2) {
  return state1.get('views') !== state2.get('views');
}

function toConnectors(elem) {
  const props = elem.get('props');
  return props
    .get('connectors')
    .map((vector, key) => ({
      pos: vector,
      id: {
        viewID: props.get('id'),
        connectorID: key
      }
    }));
}

function merge(connectors) {
  return connectors
    .reduce((nodeIDs, c) => {
      return nodeIDs.push(c.id);
    }, new Immutable.List());
}

function giveOrderedID(map, node, i) {
  return map.set(i, node);
}

function position(connector) { return connector.pos.toString(); }

function toNodes(views) {
  return views // withMutations?
    .valueSeq()
    .flatMap(toConnectors)
    .groupBy(position).valueSeq()
    .map(merge)
    .reduce(giveOrderedID, new Immutable.Map());
}

function setNodesInModels(models, nodes) {
  return models
    .withMutations(ms => {
      nodes.forEach((node, nodeID) => {
        node.forEach(connector => {
          ms.setIn([connector.viewID, 'nodes', connector.connectorID], nodeID);
        });
      });
    });
}

function getCircuitInfo(state) {
  return {
    numOfNodes: state.get('nodes').size,
    numOfVSources: state.get('models')
      .filter(m => m.has('vSources'))
      .reduce((n, m) => n + m.get('vSources'), 0)
  };
}

function solveCircuit(state, circuitInfo) {
  try {
    const {solve, stamp: stamper} = Analyser.createEquationBuilder(circuitInfo);
    state.get('models').forEach(model => {
      stamp(model, stamper);
    });
    return solve();
  } catch(e) {
    console.warn(e);
  }
}

function updateCircuit(state, solution, circuitInfo) {
  if (!solution) { return state; }

  const flattened = R.prepend(0, R.flatten(solution())); // add 0 volt ground node

  const voltages = R.take(circuitInfo.numOfNodes, flattened);
  const currents = R.drop(circuitInfo.numOfNodes, flattened);

  console.log('voltages', voltages, 'currents', currents);

  // update node voltages

  // update models with node voltages

  // update models with currents

  // update views...

  return state;
}

function Updater() {
  const eventProcessor = new EventProcessor();
  const executor = new Executor();

  let eventQueue = new Immutable.List();
  let state = new Immutable.Map({
    mode: Modes.add(Wire),
    currentOffset: 0,
    views: new Immutable.Map(), // elemID -> element view
    models: new Immutable.Map(), // elemID -> element model
    nodes: new Immutable.Map() // nodeID -> node
  });

  function processEventQueue() {
    const {mode, actions} = eventProcessor.process(eventQueue, state.get('mode'));
    eventQueue = [];
    state = state.set('mode', mode);
    return actions;
  }

  // uses previous state + delta to calculate new props for CircuitCanvas
  function update(delta) {
    state = state.update('currentOffset', currentOffset => currentOffset += delta); // TODO a better way of doing this (and handling overflow)

    const circuitInfo = getCircuitInfo(state);
    const solution = solveCircuit(state, circuitInfo);
    state = updateCircuit(state, solution, circuitInfo);

    return {
      props: {
        elements: state.get('views'),
        pushEvent: event => eventQueue.push(event)
      },
      context: {
        currentOffset: state.get('currentOffset')
      }
    };
  }

  function begin() {
    const actions = processEventQueue();
    const oldState = state;
    state = executor.executeAll(actions, oldState);
    if (viewModelChanged(state, oldState)) {
      // FIXME this will cause re-analysis even when hover-highlighting... could be better

      // create a graph of the circuit that we can use to analyse
      const nodes = toNodes(state.get('views'));
      const edges = setNodesInModels(state.get('models'), nodes);

      state = state.withMutations(s => {
        s.set('nodes', nodes).set('models', edges);
      });

      // console.log('Updater - nodes:', nodes.toJS());
      // console.log('Updater - element models:', edges.toJS());
    }
  }

  return {
    begin,
    update
  };
}

export default Updater;