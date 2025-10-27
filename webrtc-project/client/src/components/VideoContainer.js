import React, { useRef, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Videocam from '@material-ui/icons/Videocam';
import VideocamOff from '@material-ui/icons/VideocamOff';

const useStyles = makeStyles({
  paper: {
    background: '#000',
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    minHeight: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  video: {
    width: '100%',
    height: '100%',
    borderRadius: '12px'
  },
  nameTag: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    background: 'rgba(0, 0, 0, 0.7)',
    padding: '5px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 10
  },
  noVideoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  }
});

const VideoContainer = ({ videoRef, username, muted = false, isLocal = false }) => {
  const classes = useStyles();

  return (
    <Paper className={classes.paper}>
      <video
        ref={videoRef}
        className={classes.video}
        autoPlay
        playsInline
        muted={muted}
      />
      <Typography className={classes.nameTag}>
        {isLocal ? `${username} (本地)` : username}
      </Typography>
    </Paper>
  );
};

export default VideoContainer;