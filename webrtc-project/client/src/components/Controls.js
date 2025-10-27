import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Grid,
  Tooltip
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Phone from '@material-ui/icons/Phone';
import PhoneDisabled from '@material-ui/icons/PhoneDisabled';
import Mic from '@material-ui/icons/Mic';
import MicOff from '@material-ui/icons/MicOff';
import Videocam from '@material-ui/icons/Videocam';
import VideocamOff from '@material-ui/icons/VideocamOff';
import Settings from '@material-ui/icons/Settings';

const useStyles = makeStyles({
  paper: {
    background: '#1a1a1a',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  iconButton: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#333',
    '&:hover': {
      background: '#444'
    }
  },
  endCallButton: {
    background: '#f44336',
    color: '#fff',
    '&:hover': {
      background: '#d32f2f'
    }
  }
});

const Controls = ({
  isCallActive,
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onSettings
}) => {
  const classes = useStyles();

  return (
    <Paper className={classes.paper}>
      <Tooltip title={audioEnabled ? '关闭麦克风' : '打开麦克风'}>
        <IconButton
          className={classes.iconButton}
          onClick={onToggleAudio}
          style={{
            background: audioEnabled ? '#4caf50' : '#f44336'
          }}
        >
          {audioEnabled ? <Mic /> : <MicOff />}
        </IconButton>
      </Tooltip>

      <Tooltip title={videoEnabled ? '关闭摄像头' : '打开摄像头'}>
        <IconButton
          className={classes.iconButton}
          onClick={onToggleVideo}
          style={{
            background: videoEnabled ? '#4caf50' : '#f44336'
          }}
        >
          {videoEnabled ? <Videocam /> : <VideocamOff />}
        </IconButton>
      </Tooltip>

      {isCallActive && (
        <Tooltip title="挂断">
          <IconButton
            className={`${classes.iconButton} ${classes.endCallButton}`}
            onClick={onEndCall}
          >
            <PhoneDisabled />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="设置">
        <IconButton
          className={classes.iconButton}
          onClick={onSettings}
        >
          <Settings />
        </IconButton>
      </Tooltip>
    </Paper>
  );
};

export default Controls;