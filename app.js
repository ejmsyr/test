/*
 * Front‑end script for the Tacta web client.
 *
 * This module manages the game lobby (joining a room), the display of the
 * board and the player's hand, and communicates with the Cloudflare Worker
 * via a WebSocket. The game state (board, hand, other players) is sent by
 * the server. Players select cards from their hand and click on a board
 * cell to attempt a placement. The server validates moves and broadcasts
 * updated state to all clients.
 */

const lobby = document.getElementById('lobby');
const joinBtn = document.getElementById('joinBtn');
const roomIdInput = document.getElementById('roomId');
const gameDiv = document.getElementById('game');
const boardElem = document.getElementById('board');
const handElem = document.getElementById('hand');
const playerInfoElem = document.getElementById('playerInfo');

// Configuration
const BOARD_SIZE = 11;
const CENTER = Math.floor(BOARD_SIZE / 2);

// Local game state
let ws = null;
let playerId = null;
let playerColor = null;
let boardState = {}; // { 'x,y': { card: {}, orientation: 0, owner: id } }
let hand = [];
let selectedCardId = null;

joinBtn.addEventListener('click', () => {
  let roomId = roomIdInput.value.trim();
  if (!roomId) {
    // Generate a random 6‑character room ID if none provided
    roomId = Math.random().toString(36).substr(2, 6);
    roomIdInput.value = roomId;
  }
  joinGame(roomId);
});

function joinGame(roomId) {
  // Hide lobby and show game UI
  lobby.style.display = 'none';
  gameDiv.style.display = '';
  renderBoard();
  renderHand();
  playerInfoElem.textContent = `Joining room …`;

  // Establish WebSocket connection to the Worker. Switch protocol depending on current
  // location: pages site is served over HTTPS but WebSocket uses wss. If developing
  // locally with http, use ws.
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  const wsUrl = `${protocol}://${host}/room?id=${encodeURIComponent(roomId)}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    // Announce join to the server. Send a JOIN message. Additional data like
    // player name could be added here.
    const msg = { type: 'JOIN' };
    ws.send(JSON.stringify(msg));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (err) {
      console.error('Failed to parse message', err);
    }
  };

  ws.onclose = (evt) => {
    console.log('WebSocket closed', evt);
    playerInfoElem.textContent = 'Connection closed.';
  };

  ws.onerror = (err) => {
    console.error('WebSocket error', err);
  };
}

/**
 * Handle inbound messages from the server. The protocol is simple:
 *  - WELCOME: server assigns playerId and color
 *  - STATE: contains current board and hand for this player
 *  - ERROR: message when a move or join fails
 *  - END: game ended; includes scoring
 */
function handleServerMessage(msg) {
  switch (msg.type) {
    case 'WELCOME':
      playerId = msg.playerId;
      playerColor = msg.color;
      playerInfoElem.textContent = `You are ${playerColor} (ID ${playerId})`;
      break;
    case 'STATE':
      // Update board and hand
      boardState = msg.game.board;
      hand = msg.game.hand;
      renderBoard();
      renderHand();
      break;
    case 'ERROR':
      alert(msg.reason || 'An error occurred');
      break;
    case 'END':
      // Display results
      const scores = msg.scores;
      let resultText = 'Game over!\n';
      for (const p of scores) {
        resultText += `${p.color}: ${p.score}\n`;
      }
      alert(resultText);
      break;
    default:
      console.warn('Unknown message type', msg);
  }
}

function renderBoard() {
  // Rebuild the grid cells
  boardElem.innerHTML = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = col;
      cell.dataset.y = row;
      // Determine board coordinates relative to center
      const gx = col - CENTER;
      const gy = row - CENTER;
      const key = `${gx},${gy}`;
      const occupant = boardState[key];
      if (occupant) {
        const { card, orientation, owner } = occupant;
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.style.background = card.color;
        cardDiv.innerHTML = `<div>${card.id}<br/>\n${card.edges
          .map((e) => e.shape)
          .join('-')}<br/>${card.dots}•</div>`;
        cell.appendChild(cardDiv);
      }
      cell.addEventListener('click', onCellClick);
      boardElem.appendChild(cell);
    }
  }
}

function renderHand() {
  handElem.innerHTML = '';
  hand.forEach((card) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'hand-card';
    cardDiv.style.background = card.color;
    cardDiv.textContent = `${card.id}\n${card.dots}•`;
    if (card.id === selectedCardId) {
      cardDiv.style.outline = '3px solid #444';
    }
    cardDiv.addEventListener('click', () => {
      // Select or deselect card
      if (selectedCardId === card.id) {
        selectedCardId = null;
      } else {
        selectedCardId = card.id;
      }
      renderHand();
    });
    handElem.appendChild(cardDiv);
  });
}

function onCellClick(event) {
  if (!selectedCardId || !ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }
  const x = parseInt(event.currentTarget.dataset.x, 10);
  const y = parseInt(event.currentTarget.dataset.y, 10);
  const boardX = x - CENTER;
  const boardY = y - CENTER;
  const move = {
    type: 'PLAY',
    cardId: selectedCardId,
    x: boardX,
    y: boardY,
    orientation: 0, // orientation fixed for now; clients could implement rotation UI
  };
  ws.send(JSON.stringify(move));
  // Optimistically clear selection; server will update hand
  selectedCardId = null;
  renderHand();
}