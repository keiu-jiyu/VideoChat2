import React from 'react';
import {
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Box,
  Typography,
  Divider
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Phone from '@material-ui/icons/Phone';
import PersonAdd from '@material-ui/icons/PersonAdd';
import Videocam from '@material-ui/icons/Videocam';

const useStyles = makeStyles({
  paper: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#2a2a2a',
    borderRadius: '12px'
  },
  header: {
    padding: '16px',
    background: '#1a1a1a',
    borderBottom: '1px solid #444'
  },
  list: {
    flex: 1,
    overflow: 'auto'
  },
  listItem: {
    '&:hover': {
      background: '#333'
    }
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#888'
  }
});

const UserList = ({ users, currentUserId, onCall }) => {
  const classes = useStyles();

  const otherUsers = users.filter(user => user.userId !== currentUserId);

  return (
    <Paper className={classes.paper}>
      <Box className={classes.header}>
        <Typography variant="h6">
          👥 在线用户 ({otherUsers.length})
        </Typography>
      </Box>

      {otherUsers.length === 0 ? (
        <Box className={classes.emptyState}>
          <Typography variant="body2">暂无其他用户</Typography>
        </Box>
      ) : (
        <List className={classes.list}>
          {otherUsers.map((user) => (
            <React.Fragment key={user.userId}>
              <ListItem className={classes.listItem}>
                <ListItemIcon>
                  <Videocam color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={user.username}
                  secondary={user.userId.substring(0, 8) + '...'}
                />
                <IconButton
                  edge="end"
                  color="primary"
                  onClick={() => onCall(user)}
                  title="呼叫"
                >
                  <Phone />
                </IconButton>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default UserList;