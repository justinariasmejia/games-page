import React from 'react';

const Dot = ({ top, left, bottom, right, center }) => {
  const position = {};
  if (top !== undefined) position.top = top;
  if (left !== undefined) position.left = left;
  if (bottom !== undefined) position.bottom = bottom;
  if (right !== undefined) position.right = right;
  
  if (center) {
    position.top = '50%';
    position.left = '50%';
    position.transform = 'translate(-50%, -50%)';
  }

  return (
    <div style={{
      position: 'absolute',
      width: '18%',
      height: '18%',
      backgroundColor: '#111',
      borderRadius: '50%',
      ...position
    }} />
  );
};

const HalfTile = ({ number }) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '50%',
      backgroundColor: '#f5f5f5',
      boxSizing: 'border-box'
    }}>
      {number === 1 && <Dot center />}
      {number === 2 && <><Dot top="15%" left="15%" /><Dot bottom="15%" right="15%" /></>}
      {number === 3 && <><Dot top="15%" left="15%" /><Dot center /><Dot bottom="15%" right="15%" /></>}
      {number === 4 && <><Dot top="15%" left="15%" /><Dot top="15%" right="15%" /><Dot bottom="15%" left="15%" /><Dot bottom="15%" right="15%" /></>}
      {number === 5 && <><Dot top="15%" left="15%" /><Dot top="15%" right="15%" /><Dot center /><Dot bottom="15%" left="15%" /><Dot bottom="15%" right="15%" /></>}
      {number === 6 && <>
        <Dot top="15%" left="15%" /><Dot top="15%" right="15%" />
        <Dot top="41%" left="15%" /><Dot top="41%" right="15%" />
        <Dot bottom="15%" left="15%" /><Dot bottom="15%" right="15%" />
      </>}
    </div>
  );
};

export default function DominoTile({ topNumber, bottomNumber, isHorizontal = false, isDouble = false }) {
  // A double is placed perpendicular to the flow
  // In a generic horizontal board flow, a regular tile lies horizontally, and a double lies vertically.
  // In hand, all tiles are vertical.
  
  // So if we are "in board horizontal", standard tiles should rotate -90, doubles stay vertical.
  // Or vice versa depending on aesthetics. Let's make standard board tiles horizontal.
  let rotation = 0;
  if (isHorizontal) {
    if (isDouble) {
      // Double stays vertical in a horizontal chain
      rotation = 0;
    } else {
      // Regular tile rotates to lay horizontally
      rotation = -90;
    }
  }

  return (
    <div style={{
      width: '44px',
      height: '88px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      boxShadow: 'inset 0 0 4px rgba(0,0,0,0.2), 0 4px 6px rgba(0,0,0,0.3)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transform: `rotate(${rotation}deg)`,
      transition: 'transform 0.3s ease',
      margin: isHorizontal && !isDouble ? '0 10px' : '0' // extra spacing if horizontal so they don't overlap due to rotation bounding box
    }}>
      <HalfTile number={topNumber} />
      <div style={{ width: '100%', height: '2px', backgroundColor: '#333' }} />
      <HalfTile number={bottomNumber} />
    </div>
  );
}
