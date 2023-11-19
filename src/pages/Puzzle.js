import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";

import React from "react";
import "../styles/puzzle.css";

const getShuffledPuzzle = () => {
  const values = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  const rowOne = [],
    rowTwo = [],
    rowThree = [];

  while (values.length) {
    const random = Math.floor(Math.random() * values.length);

    if (rowOne.length < 3) {
      rowOne.push(values.splice(random, 1)[0]);
    } else if (rowTwo.length < 3) {
      rowTwo.push(values.splice(random, 1)[0]);
    } else {
      rowThree.push(values.splice(random, 1)[0]);
    }
  }

  return [rowOne, rowTwo, rowThree];
};

const flattenArray = arr => {
  return arr.reduce((flatArr, subArr) => flatArr.concat(subArr), []);
};

const getInversionsCount = arr => {
  arr = flattenArray(arr).filter(n => n !== 0);

  const inversions = [];

  for (let i = 0; i < arr.length - 1; i++) {
    const currentValue = arr[i];
    const currentInversions = arr.filter(
      (val, j) => i < j && val < currentValue
    );
    inversions.push(currentInversions.length);
  }

  const inversionsCount = inversions.reduce((total, val) => total + val, 0);

  return inversionsCount;
};

const isSolvable = puzzle => {
  return getInversionsCount(puzzle) % 2 === 0;
};

const getPuzzle = () => {
  let puzzle = getShuffledPuzzle();

  while (!isSolvable(puzzle)) {
    puzzle = getShuffledPuzzle();
  }

  return puzzle;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [puzzle, setPuzzle] = React.useState([]);
  const [complete, setComplete] = React.useState(false);
  const [moves, setMoves] = React.useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [bestMoves, setBestMoves] = useState(null);
  const [bestTime, setBestTime] = useState(null);
  const [timerDisplay, setTimerDisplay] = useState("0:00");
  const history = useNavigate();

  useEffect(() => {
    // Check if the user is authenticated
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
  
        // Load the puzzle when the user is authenticated
        setPuzzle(getPuzzle());
  
        // Fetch previous best time and moves from Firestore
        const fetchBestStats = async () => {
          try {
            const userDocRef = doc(firestore, "usersCollection", user.email);
            const docSnapshot = await getDoc(userDocRef);
        
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              setBestMoves(data.moves);
              setBestTime(data.elapsedTime);
            }
          } catch (error) {
            console.error("Error fetching best stats:", error.message);
          }
        };
  
        fetchBestStats();
      } else {
        // If not authenticated, redirect to the login page
        history("/signin");
      }
    });
  
    // Clean up the subscription when the component unmounts
    return () => unsubscribe();
  }, [history]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      history("/signin"); // Redirect to sign-in page after logout
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  React.useEffect(() => {
    setPuzzle(getPuzzle());
  }, []);

  const movePiece = (x, y) => {
    if (!complete) {
      if (checkNeighbours(x, y) || checkNeighbours(x, y, 2)) {
        const emptySlot = checkNeighbours(x, y) || checkNeighbours(x, y, 2);

        const newPuzzle = puzzle.map(row => row.slice());

        if (x === emptySlot.x && y < emptySlot.y) {
          newPuzzle[emptySlot.x][emptySlot.y] = puzzle[x][y + 1];
          newPuzzle[x][y + 1] = newPuzzle[x][y];
          newPuzzle[x][y] = 0;
        } else if (x === emptySlot.x && y > emptySlot.y) {
          newPuzzle[emptySlot.x][emptySlot.y] = puzzle[x][y - 1];
          newPuzzle[x][y - 1] = newPuzzle[x][y];
          newPuzzle[x][y] = 0;
        }

        if (y === emptySlot.y && x < emptySlot.x) {
          newPuzzle[emptySlot.x][emptySlot.y] = puzzle[x + 1][y];
          newPuzzle[x + 1][y] = newPuzzle[x][y];
          newPuzzle[x][y] = 0;
        } else if (y === emptySlot.y && x > emptySlot.x) {
          newPuzzle[emptySlot.x][emptySlot.y] = puzzle[x - 1][y];
          newPuzzle[x - 1][y] = newPuzzle[x][y];
          newPuzzle[x][y] = 0;
        }

        setPuzzle(newPuzzle);

        setMoves(moves + 1);

        checkCompletion(newPuzzle);
      }
    }
  };

  const checkCompletion = puzzle => {
    if (flattenArray(puzzle).join("") === "123456780") {
      setComplete(true);
    }
  };

  const checkNeighbours = (x, y, d = 1) => {
    const neighbours = [];

    if (puzzle[x][y] !== 0) {
      neighbours.push(
        puzzle[x - d] && puzzle[x - d][y] === 0 && { x: x - d, y: y }
      );
      neighbours.push(puzzle[x][y + d] === 0 && { x: x, y: y + d });
      neighbours.push(
        puzzle[x + d] && puzzle[x + d][y] === 0 && { x: x + d, y: y }
      );
      neighbours.push(puzzle[x][y - d] === 0 && { x: x, y: y - d });
    }

    const emptySlot = neighbours.find(el => typeof el === "object");

    return emptySlot;
  };

  useEffect(() => {
    if (moves >= 1 && !complete && startTime === null) {
      // Record the start time on the first move
      setStartTime(new Date().getTime());
    }
  }, [moves, complete, startTime]);

  useEffect(() => {
    let intervalId;

    if (startTime && !complete) {
      // Update timer display every second
      intervalId = setInterval(() => {
        const currentTime = new Date().getTime();
        const timeElapsed = currentTime - startTime;
        const seconds = Math.floor(timeElapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const formattedTime = `${minutes}:${remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}`;
        setTimerDisplay(formattedTime);
      }, 1000);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [startTime, complete]);

  useEffect(() => {
    if (complete) {
      // Stop the timer when the puzzle is solved
      const endTime = new Date().getTime();
      const timeElapsed = endTime - startTime;
      setElapsedTime(timeElapsed);

      const saveCompletedPuzzle = async () => {
        try {
          // Use the user's email as the document ID
          const userDocRef = doc(firestore, "usersCollection", user.email);
      
          // Fetch the existing data
          const docSnapshot = await getDoc(userDocRef);
      
          // Check if the document exists
          if (docSnapshot.exists()) {
            const existingData = docSnapshot.data();
      
            // Compare with the new data
            if (!existingData.bestMoves || moves < existingData.bestMoves) {
              // Update the document only if the new score is better
              await setDoc(userDocRef, {
                moves: moves,
                elapsedTime: timeElapsed,
                timestamp: new Date(),
                moves: moves, // Update the best moves field
                elapsedTime: timeElapsed, // Update the best time field
              });
      
              console.log("Completed puzzle details updated in Firestore.");
            }
          } else {
            // If the document doesn't exist, create a new one
            await setDoc(userDocRef, {
              moves: moves,
              elapsedTime: timeElapsed,
              timestamp: new Date(),
              moves: moves, // Set the best moves field
              elapsedTime: timeElapsed, // Set the best time field
            });
      
            console.log("New completed puzzle details saved to Firestore.");
          }
        } catch (error) {
          console.error("Error saving/updating completed puzzle details:", error.message);
        }
      };

      saveCompletedPuzzle();
    }
  }, [complete, user, moves, startTime]);

  const resetPuzzle = () => {
    setComplete(false);
    setPuzzle(getPuzzle());
    setMoves(0);
    setStartTime(null);
    setElapsedTime(0);
    setTimerDisplay("0:00");
    window.location.reload();
  };

  const formatTime = (time) => {
    const seconds = Math.floor(time / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}`;
  };

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      {user && (
        <div>
          <p>Welcome, {user.email}!</p>
        </div>
      )}
      {user && (
        <button onClick={handleLogout}>
          Logout
        </button>
      )}
      {startTime && !complete && (
        <p>Elapsed Time: {timerDisplay}</p>
      )}
      {complete && (
        <div>
          <p>Elapsed Time: {timerDisplay}</p>
          <p>Puzzle Completed!</p>
        </div>
      )}
      {<h3>Moves: {moves}</h3>}
      <p>Best Moves: {bestMoves}</p>
      <p>Best Time: {formatTime(bestTime)}</p>
      <div
        style={{
          display: "inline-block",
          backgroundColor: "darkgray",
          border: `5px solid ${complete ? "black" : "gray"}`,
          borderRadius: 5,
          padding: 5
        }}
      >
        {puzzle.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex"
            }}
          >
            {row.map((col, j) => {
              const color = col === 0 ? "transparent" : "lightgray";
              return (
                <div
                  key={`${i}-${j}`}
                  onClick={() => movePiece(i, j)}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: 77,
                    height: 77,
                    margin: 2,
                    backgroundColor: color,
                    borderRadius: 5,
                    cursor: complete ? "not-allowed" : "pointer",
                    userSelect: "none"
                  }}
                >
                  <span style={{ fontSize: "2rem", fontWeight: "bold" }}>
                    {col !== 0 && col}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {complete && (
        <p>
          <button
            onClick={() => {
              resetPuzzle();
            }}
          >
            Play Again
          </button>
        </p>
      )}
    </div>
    
  );
}
