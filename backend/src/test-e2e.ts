import { io } from 'socket.io-client';

async function runTest() {
  console.log('🧪 Starting End-to-End WebSocket & RBAC Verification Test...\n');

  const SERVER_URL = 'http://localhost:5001';


  // Helper to register / login user via REST API
  async function registerUser(username: string, password: string = 'password123') {
    const res = await fetch(`${SERVER_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      const data = await res.json();
      return data.token;
    }
    const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const loginData = await loginRes.json();
    return loginData.token;
  }

  // --- Test 0: Security & Auth Enforcement ---
  console.log('--- Testing Security: Unauthenticated Join Rejection ---');
  const eve = io(SERVER_URL);
  await new Promise<void>((resolve) => eve.on('connect', resolve));
  
  const authRequiredPromise = new Promise<{ code: string; message: string }>((resolve) => {
    eve.on('auth_required', (data) => resolve(data));
  });

  eve.emit('join_room', { roomId: 'E2E_ROOM', username: 'Eve' }); // No token!
  const authErr = await authRequiredPromise;
  console.log(`✅ Unauthenticated user (Eve) blocked properly: "${authErr.message}"`);
  eve.disconnect();

  // --- Step 1: Register and Authenticate Alice & Bob ---
  console.log('\n--- Authenticating Users ---');
  const aliceToken = await registerUser(`Alice_${Date.now()}`);
  const bobToken = await registerUser(`Bob_${Date.now()}`);
  console.log('✅ Alice authenticated successfully with session token');
  console.log('✅ Bob authenticated successfully with session token');

  // 1. Connect Host (Alice)
  const alice = io(SERVER_URL);
  let aliceId = '';
  let bobId = '';

  await new Promise<void>((resolve) => alice.on('connect', resolve));
  console.log('✅ Alice connected to WebSocket server');

  alice.emit('join_room', { roomId: 'E2E_ROOM', token: aliceToken });

  const aliceInitialState: any = await new Promise((resolve) => {
    alice.once('sync_state', (data) => {
      if (data.myUserId) aliceId = data.myUserId;
      resolve(data);
    });
  });

  console.log(`✅ Alice joined E2E_ROOM. Role: ${aliceInitialState.myRole} (Expected: host)`);
  if (aliceInitialState.myRole !== 'host') {
    throw new Error('Host role assignment failed!');
  }

  // 2. Connect Participant (Bob)
  const bob = io(SERVER_URL);
  await new Promise<void>((resolve) => bob.on('connect', resolve));
  console.log('✅ Bob connected to WebSocket server');

  bob.emit('join_room', { roomId: 'E2E_ROOM', token: bobToken });

  const bobInitialState: any = await new Promise((resolve) => {
    bob.once('sync_state', (data) => {
      if (data.myUserId) bobId = data.myUserId;
      resolve(data);
    });
  });

  console.log(`✅ Bob joined E2E_ROOM. Role: ${bobInitialState.myRole} (Expected: participant)`);
  if (bobInitialState.myRole !== 'participant') {
    throw new Error('Participant role assignment failed!');
  }

  // 3. Playback Sync Test (Alice plays at 15s)
  console.log('\n--- Testing Playback Sync ---');
  const playPromise = new Promise((resolve) => {
    bob.on('sync_state', (state) => {
      if (state.playState === 'playing') {
        resolve(state);
      }
    });
  });

  alice.emit('play', { currentTime: 15 });
  const playStateReceived: any = await playPromise;
  console.log(`✅ Bob received play event. State: ${playStateReceived.playState}, Time: ${playStateReceived.currentTime}`);

  // 4. Role Enforcement Test: Bob attempts unauthorized seek
  console.log('\n--- Testing Role Enforcement (Participant seeking) ---');
  const bobErrorPromise = new Promise((resolve) => {
    bob.on('error_message', (err) => resolve(err));
  });

  bob.emit('seek', { time: 120 });
  const bobError: any = await bobErrorPromise;
  console.log(`✅ Bob seek rejected properly: "${bobError.message}"`);

  // 5. Host assigns Moderator to Bob
  console.log('\n--- Testing Role Promotion (Host -> Mod) ---');
  const roleUpdatePromise = new Promise((resolve) => {
    bob.on('role_assigned', (data) => {
      if (data.userId === bobId) resolve(data);
    });
  });

  alice.emit('assign_role', { userId: bobId, role: 'moderator' });
  const roleAssigned: any = await roleUpdatePromise;
  console.log(`✅ Bob promoted to: ${roleAssigned.role}`);

  // 6. Now Moderator Bob performs seek
  console.log('\n--- Testing Moderator Seek ---');
  const modSeekPromise = new Promise((resolve) => {
    alice.on('sync_state', (state) => {
      if (Math.abs(state.currentTime - 120) < 2) resolve(state);
    });
  });

  bob.emit('seek', { time: 120 });
  const modState: any = await modSeekPromise;
  console.log(`✅ Moderator Bob successfully seeked to: ${modState.currentTime}s`);

  // 7. Chat test
  console.log('\n--- Testing Real-time Chat ---');
  const chatPromise = new Promise((resolve) => {
    alice.on('chat_message', (msg) => {
      if (msg.text === 'Hello Alice!') resolve(msg);
    });
  });

  bob.emit('send_message', { text: 'Hello Alice!' });
  const chatMsg: any = await chatPromise;
  console.log(`✅ Alice received chat from ${chatMsg.username} (${chatMsg.role}): "${chatMsg.text}"`);

  // 8. Reaction test
  console.log('\n--- Testing Live Reaction ---');
  const reactionPromise = new Promise((resolve) => {
    alice.on('reaction', (rx) => {
      if (rx.emoji === '🔥') resolve(rx);
    });
  });

  bob.emit('send_reaction', { emoji: '🔥' });
  const rxMsg: any = await reactionPromise;
  console.log(`✅ Alice received reaction: ${rxMsg.emoji} from ${rxMsg.username}`);

  // Cleanup
  alice.disconnect();
  bob.disconnect();

  console.log('\n🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS!\n');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
