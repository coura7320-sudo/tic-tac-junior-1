import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

function Square({ value, onSquareClick }) {
  return (
    <button className="square" onClick={onSquareClick}>
      {value}
    </button>
  );
}

function Board({ xIsNext, squares, onPlay, myRole }) {
  function handleClick(i) {
    if (calculateWinner(squares) || squares[i]) {
      return;
    }
    
    // Turn Management: Check if it's the current player's turn
    const currentTurn = xIsNext ? 'X' : 'O';
    if (myRole !== currentTurn) {
      return; // Disable clicking for the player whose turn it isn't
    }

    const nextSquares = squares.slice();
    if (xIsNext) {
      nextSquares[i] = 'X';
    } else {
      nextSquares[i] = 'O';
    }
    onPlay(nextSquares);
  }

  const winner = calculateWinner(squares);
  const isDraw = !winner && squares.every(square => square !== null);
  
  let status;
  if (winner) {
    status = 'Winner: ' + winner;
  } else if (isDraw) {
    status = 'No winner';
  } else {
    const currentTurn = xIsNext ? 'X' : 'O';
    status = 'Next player: ' + currentTurn + ` (You are ${myRole})`;
  }

  return (
    <>
      <div className="status">{status}</div>
      <div className="board-row">
        <Square value={squares[0]} onSquareClick={() => handleClick(0)} />
        <Square value={squares[1]} onSquareClick={() => handleClick(1)} />
        <Square value={squares[2]} onSquareClick={() => handleClick(2)} />
      </div>
      <div className="board-row">
        <Square value={squares[3]} onSquareClick={() => handleClick(3)} />
        <Square value={squares[4]} onSquareClick={() => handleClick(4)} />
        <Square value={squares[5]} onSquareClick={() => handleClick(5)} />
      </div>
      <div className="board-row">
        <Square value={squares[6]} onSquareClick={() => handleClick(6)} />
        <Square value={squares[7]} onSquareClick={() => handleClick(7)} />
        <Square value={squares[8]} onSquareClick={() => handleClick(8)} />
      </div>
    </>
  );
}

export default function Game() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  
  const [roomID, setRoomID] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [myRole, setMyRole] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const socketRef = useRef(null);

  useEffect(() => {
    // 1. Initialize socket inside useRef (connect once)
    socketRef.current = io("http://localhost:4000");

    // Listen for room info
    socketRef.current.on("room_joined", (data) => {
      setJoinedRoom(true);
      setMyRole(data.role);
      setErrorMsg('');
    });

    socketRef.current.on("room_error", (msg) => {
      setErrorMsg(msg);
    });

    // 3. Listen for move updates from the server
    socketRef.current.on("move_made", (data) => {
      setSquares(data.squares);
      setXIsNext(data.xIsNext);
    });

    // Listen for game restart from opponent
    socketRef.current.on("game_restarted", () => {
      setSquares(Array(9).fill(null));
      setXIsNext(true);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  function joinRoom() {
    if (roomID.trim() !== '') {
      socketRef.current.emit("join_room", roomID);
    }
  }

  function handlePlay(nextSquares) {
    const nextXIsNext = !xIsNext;
    setSquares(nextSquares);
    setXIsNext(nextXIsNext);

    // 2. Emit the change to the server
    socketRef.current.emit("make_move", {
      roomID,
      squares: nextSquares,
      xIsNext: nextXIsNext
    });
  }

  function handleRestart() {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    socketRef.current.emit("restart_game", roomID);
  }

  if (!joinedRoom) {
    // Room Setup UI
    return (
      <div className="game" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
        <h2>Multiplayer Room Setup</h2>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="text" 
            placeholder="Enter Room ID" 
            value={roomID} 
            onChange={(e) => setRoomID(e.target.value)}
            style={{ padding: '5px', fontSize: '16px' }}
          />
          <button onClick={joinRoom} style={{ padding: '5px 10px', fontSize: '16px', marginLeft: '5px' }}>
            Join Room
          </button>
        </div>
        {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      </div>
    );
  }

  const winnerContent = calculateWinner(squares);
  const isDraw = !winnerContent && squares.every(square => square !== null);
  const isGameOver = winnerContent || isDraw;

  return (
    <div className="game">
      <div className="game-board">
        <Board xIsNext={xIsNext} squares={squares} onPlay={handlePlay} myRole={myRole} />
      </div>
      <div className="game-info" style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column' }}>
        <div>Room ID: <strong>{roomID}</strong></div>
        <div>Your Role: <strong>{myRole}</strong></div>
        {isGameOver && (
          <button style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1rem', background: '#38bdf8' }} onClick={handleRestart}>
            Restart Game
          </button>
        )}
      </div>
    </div>
  );
}

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}
