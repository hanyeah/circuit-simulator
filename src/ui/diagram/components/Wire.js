import React from 'react';
import { Group } from 'react-art';

import { BaseData } from './models/AllModels.js';
import DrawingUtils from '../../utils/DrawingUtils.js';
import Line from '../../utils/Line.js';
import CurrentPath from '../CurrentPath.js';
import { get2PointBoundingBox } from '../boundingBox.js';

import { getDragFunctionFor, get2ConnectorsFromDragPoints } from '../Utils.js';
import { GRID_SIZE } from '../Constants.js';
import { LINE_WIDTH } from '../../Constants.js';

const { PropTypes } = DrawingUtils;

const MIN_LENGTH = GRID_SIZE;

const BaseWireModel = BaseData.Wire;

const Wire = ({
    // voltages = [0, 0],
    currents = [0],
    connectors,
    color: propColor,
    theme
  }) => {
  const color = propColor || theme.COLORS.base;

  return (
    <Group>
      <Line
        color={color}
        points={connectors}
        width={LINE_WIDTH}
      />
      <CurrentPath
        connectors={connectors}
        current={currents[0]}
        theme={theme}
      />
    </Group>
  );
};

Wire.propTypes = {
  id: React.PropTypes.string.isRequired,

  voltages: React.PropTypes.arrayOf(React.PropTypes.number),
  currents: React.PropTypes.arrayOf(React.PropTypes.number),
  connectors: React.PropTypes.arrayOf(PropTypes.Vector).isRequired,

  color: React.PropTypes.string,
  theme: React.PropTypes.object.isRequired
};

Wire.dragPoint = getDragFunctionFor(MIN_LENGTH);
Wire.getConnectorPositions = get2ConnectorsFromDragPoints;

Wire.typeID = BaseWireModel.typeID;

Wire.getBoundingBox = get2PointBoundingBox(LINE_WIDTH * 2);

export default Wire;
