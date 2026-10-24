import { Server, Socket } from 'socket.io';
import { RoomManager } from '../services/RoomManager';
import { DatabaseService } from '../db/database';
import { Role } from '../types';

export function setupSocketHandlers(io: Server): void {
  const roomManager = RoomManager.getInstance();
  const db = DatabaseService.getInstance();

  io.on('connection', (socket: Socket) => {
    // 1. JOIN ROOM
    socket.on('join_room', (data: { roomId: string; username: string }) => {
      const { roomId, username } = data;
      if (!roomId || !username) {
        socket.emit('error_message', { message: 'Room ID and Username are required.' });
        return;
      }

      const cleanUsername = username.trim().substring(0, 25);
      const cleanRoomId = roomId.trim().toUpperCase();

      const { room, participant } = roomManager.joinRoom(cleanRoomId, cleanUsername, socket.id);

      socket.join(`room:${room.id}`);

      // Broadcast user_joined to everyone in room
      io.to(`room:${room.id}`).emit('user_joined', {
        username: participant.username,
        userId: participant.id,
        role: participant.role,
        participants: room.getParticipantsList()
      });

      // Send initial sync_state to the joining client
      socket.emit('sync_state', {
        ...room.toStatePayload(),
        myUserId: participant.id,
        myRole: participant.role
      });

      // Send recent chat messages history from DB
      const messages = db.getRoomMessages(room.id, 50);
      socket.emit('chat_history', {
        messages: messages.map(m => ({
          id: m.id,
          roomId: m.room_id,
          userId: m.user_id,
          username: m.username,
          role: m.role,
          text: m.text,
          timestamp: m.created_at
        }))
      });

      // Send system message in chat
      const sysMsg = {
        id: 'sys_' + Date.now(),
        roomId: room.id,
        userId: 'system',
        username: 'System',
        role: 'system' as any,
        text: `${cleanUsername} joined the party as ${participant.role.toUpperCase()}.`,
        timestamp: Date.now()
      };
      io.to(`room:${room.id}`).emit('chat_message', sysMsg);
    });

    // 2. LEAVE ROOM
    socket.on('leave_room', (data?: { roomId?: string }) => {
      const { room, participant } = roomManager.removeSocket(socket.id);
      if (room && participant) {
        socket.leave(`room:${room.id}`);

        io.to(`room:${room.id}`).emit('user_left', {
          username: participant.username,
          userId: participant.id,
          participants: room.getParticipantsList(),
          newHostId: room.hostId
        });

        io.to(`room:${room.id}`).emit('chat_message', {
          id: 'sys_' + Date.now(),
          roomId: room.id,
          userId: 'system',
          username: 'System',
          role: 'system' as any,
          text: `${participant.username} left the room.`,
          timestamp: Date.now()
        });
      }
    });

    // 3. PLAY
    socket.on('play', (data?: { currentTime?: number }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const participant = room.getParticipantBySocket(socket.id);
      if (!participant) return;

      const result = room.updatePlayback('playing', data?.currentTime, participant.id);
      if (!result.success) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      roomManager.persistRoomState(room);

      // Broadcast play state to all clients
      io.to(`room:${room.id}`).emit('sync_state', room.toStatePayload());
      io.to(`room:${room.id}`).emit('play_event', {
        triggeredBy: participant.username,
        currentTime: room.currentTime
      });
    });

    // 4. PAUSE
    socket.on('pause', (data?: { currentTime?: number }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const participant = room.getParticipantBySocket(socket.id);
      if (!participant) return;

      const result = room.updatePlayback('paused', data?.currentTime, participant.id);
      if (!result.success) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      roomManager.persistRoomState(room);

      io.to(`room:${room.id}`).emit('sync_state', room.toStatePayload());
      io.to(`room:${room.id}`).emit('pause_event', {
        triggeredBy: participant.username,
        currentTime: room.currentTime
      });
    });

    // 5. SEEK
    socket.on('seek', (data: { time: number }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const participant = room.getParticipantBySocket(socket.id);
      if (!participant) return;

      const result = room.seek(data.time, participant.id);
      if (!result.success) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      roomManager.persistRoomState(room);

      io.to(`room:${room.id}`).emit('sync_state', room.toStatePayload());
      io.to(`room:${room.id}`).emit('seek_event', {
        triggeredBy: participant.username,
        time: data.time
      });
    });

    // 6. CHANGE VIDEO
    socket.on('change_video', (data: { videoId: string }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const participant = room.getParticipantBySocket(socket.id);
      if (!participant) return;

      const result = room.changeVideo(data.videoId, participant.id);
      if (!result.success) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      roomManager.persistRoomState(room);

      io.to(`room:${room.id}`).emit('sync_state', room.toStatePayload());
      io.to(`room:${room.id}`).emit('chat_message', {
        id: 'sys_' + Date.now(),
        roomId: room.id,
        userId: 'system',
        username: 'System',
        role: 'system' as any,
        text: `${participant.username} changed the video.`,
        timestamp: Date.now()
      });
    });

    // 7. ASSIGN ROLE (Host Only)
    socket.on('assign_role', (data: { userId: string; role: Role }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const host = room.getParticipantBySocket(socket.id);
      if (!host) return;

      const result = room.assignRole(host.id, data.userId, data.role);
      if (!result.success) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      const target = room.getParticipant(data.userId);
      if (target) {
        db.updateParticipantRole(target.id, data.role);

        io.to(`room:${room.id}`).emit('role_assigned', {
          userId: target.id,
          username: target.username,
          role: target.role,
          participants: room.getParticipantsList()
        });

        io.to(`room:${room.id}`).emit('chat_message', {
          id: 'sys_' + Date.now(),
          roomId: room.id,
          userId: 'system',
          username: 'System',
          role: 'system' as any,
          text: `${host.username} updated ${target.username}'s role to ${data.role.toUpperCase()}.`,
          timestamp: Date.now()
        });
      }
    });

    // 8. REMOVE PARTICIPANT (Host Only)
    socket.on('remove_participant', (data: { userId: string }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const host = room.getParticipantBySocket(socket.id);
      if (!host) return;

      const target = room.getParticipant(data.userId);
      if (!target) return;

      const result = room.removeUser(host.id, data.userId);
      if (!result.success) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      // Notify target socket directly
      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.emit('participant_removed_self', {
          message: 'You have been removed from the watch party by the host.'
        });
        targetSocket.leave(`room:${room.id}`);
      }

      // Broadcast to remaining room
      io.to(`room:${room.id}`).emit('participant_removed', {
        userId: data.userId,
        username: target.username,
        participants: room.getParticipantsList()
      });

      io.to(`room:${room.id}`).emit('chat_message', {
        id: 'sys_' + Date.now(),
        roomId: room.id,
        userId: 'system',
        username: 'System',
        role: 'system' as any,
        text: `${target.username} was removed from the party by ${host.username}.`,
        timestamp: Date.now()
      });
    });

    // 9. TRANSFER HOST (Host Only)
    socket.on('transfer_host', (data: { newHostId: string }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const currentHost = room.getParticipantBySocket(socket.id);
      if (!currentHost) return;

      const result = room.transferHost(currentHost.id, data.newHostId);
      if (!result.success) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      const newHost = room.getParticipant(data.newHostId);
      if (newHost) {
        db.updateParticipantRole(currentHost.id, 'moderator');
        db.updateParticipantRole(newHost.id, 'host');
        roomManager.persistRoomState(room);

        io.to(`room:${room.id}`).emit('role_assigned', {
          userId: newHost.id,
          username: newHost.username,
          role: 'host',
          participants: room.getParticipantsList(),
          newHostId: newHost.id
        });

        io.to(`room:${room.id}`).emit('chat_message', {
          id: 'sys_' + Date.now(),
          roomId: room.id,
          userId: 'system',
          username: 'System',
          role: 'system' as any,
          text: `👑 Host privileges were transferred to ${newHost.username}.`,
          timestamp: Date.now()
        });
      }
    });

    // 10. TEXT CHAT
    socket.on('send_message', (data: { text: string }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const participant = room.getParticipantBySocket(socket.id);
      if (!participant) return;

      const cleanText = (data.text || '').trim();
      if (!cleanText) return;

      const msg = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        roomId: room.id,
        userId: participant.id,
        username: participant.username,
        role: participant.role,
        text: cleanText.substring(0, 500),
        createdAt: Date.now()
      };

      // Persist to DB
      db.saveChatMessage(msg);

      // Broadcast
      io.to(`room:${room.id}`).emit('chat_message', {
        id: msg.id,
        roomId: msg.roomId,
        userId: msg.userId,
        username: msg.username,
        role: msg.role,
        text: msg.text,
        timestamp: msg.createdAt
      });
    });

    // 11. REACTIONS (Burst emojis)
    socket.on('send_reaction', (data: { emoji: string }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const participant = room.getParticipantBySocket(socket.id);
      if (!participant) return;

      io.to(`room:${room.id}`).emit('reaction', {
        id: 'rx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        emoji: data.emoji || '❤️',
        username: participant.username,
        timestamp: Date.now()
      });
    });

    // 12. PERMISSION REQUEST (Participant requests control)
    socket.on('request_control', (data?: { reason?: string }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const participant = room.getParticipantBySocket(socket.id);
      if (!participant) return;

      const req = room.createControlRequest(participant.id, participant.username, data?.reason);

      // Send to Host and Moderators
      for (const p of room.participants.values()) {
        if (p.canControlPlayback()) {
          const targetSocket = io.sockets.sockets.get(p.socketId);
          if (targetSocket) {
            targetSocket.emit('control_requested', req);
          }
        }
      }

      socket.emit('request_submitted', {
        message: 'Your request for controls has been sent to the host.'
      });
    });

    // 13. RESPOND TO PERMISSION REQUEST (Host / Mod decides)
    socket.on('respond_request', (data: { requestId: string; approved: boolean; newRole?: Role }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const decider = room.getParticipantBySocket(socket.id);
      if (!decider || !decider.canControlPlayback()) return;

      const req = room.resolveControlRequest(data.requestId);
      if (!req) return;

      const target = room.getParticipant(req.userId);
      if (!target) return;

      if (data.approved) {
        const assignedRole: Role = data.newRole || 'moderator';
        target.updateRole(assignedRole);
        db.updateParticipantRole(target.id, assignedRole);

        io.to(`room:${room.id}`).emit('role_assigned', {
          userId: target.id,
          username: target.username,
          role: target.role,
          participants: room.getParticipantsList()
        });

        io.to(`room:${room.id}`).emit('chat_message', {
          id: 'sys_' + Date.now(),
          roomId: room.id,
          userId: 'system',
          username: 'System',
          role: 'system' as any,
          text: `🎉 ${decider.username} approved ${target.username}'s control request! Promoted to ${assignedRole.toUpperCase()}.`,
          timestamp: Date.now()
        });
      } else {
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) {
          targetSocket.emit('request_denied', {
            message: 'Your request for controls was declined by the host.'
          });
        }
      }
    });

    // 14. PLAYLIST QUEUE
    socket.on('add_to_queue', (data: { videoId: string; title?: string }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const participant = room.getParticipantBySocket(socket.id);
      if (!participant) return;

      const item = {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        roomId: room.id,
        videoId: data.videoId,
        title: data.title || `Video ${data.videoId}`,
        addedBy: participant.username,
        createdAt: Date.now()
      };

      room.addToQueue(item);
      db.addPlaylistItem(item);

      io.to(`room:${room.id}`).emit('queue_updated', {
        queue: room.queue
      });

      io.to(`room:${room.id}`).emit('chat_message', {
        id: 'sys_' + Date.now(),
        roomId: room.id,
        userId: 'system',
        username: 'System',
        role: 'system' as any,
        text: `${participant.username} added a video to the queue.`,
        timestamp: Date.now()
      });
    });

    socket.on('play_next', () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const participant = room.getParticipantBySocket(socket.id);
      if (!participant) return;

      const result = room.playNextFromQueue(participant.id);
      if (!result.success) {
        socket.emit('error_message', { message: result.error });
        return;
      }

      roomManager.persistRoomState(room);

      io.to(`room:${room.id}`).emit('sync_state', room.toStatePayload());
      io.to(`room:${room.id}`).emit('queue_updated', { queue: room.queue });
    });

    // 15. DISCONNECT
    socket.on('disconnect', () => {
      const { room, participant } = roomManager.removeSocket(socket.id);
      if (room && participant) {
        io.to(`room:${room.id}`).emit('user_left', {
          username: participant.username,
          userId: participant.id,
          participants: room.getParticipantsList(),
          newHostId: room.hostId
        });

        io.to(`room:${room.id}`).emit('chat_message', {
          id: 'sys_' + Date.now(),
          roomId: room.id,
          userId: 'system',
          username: 'System',
          role: 'system' as any,
          text: `${participant.username} disconnected.`,
          timestamp: Date.now()
        });
      }
    });
  });
}
