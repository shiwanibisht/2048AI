BETA_THRESHOLD = 20;

function intToFloat(num){
  return num.toFixed(4);
}


function fastLog(n){
  var counter = 0;
  while (n>1) {
    n = n >> 1;
    counter ++;
  }
  return counter;
}

function AI(grid) {
  this.grid = grid;
}

// static evaluation function
AI.prototype.eval = function() {
  // take into account the number of empty cells
  var emptyCells = Math.max(1, this.grid.availableCells().length);
  //console.log("emptyCells "+emptyCells)
  // take into account the maximum value on the board
  // that would result from this move. 
  var max = Math.max(1, this.grid.max());
  //console.log("gridmax "+max)
  // take into account the similarity of the tiles on
  // the board
  var boardSim = Math.max(1, this.grid.boardSimilarityScore());
  //console.log("boardSim "+boardSim)
  //var boardSim = this.grid.boardSimilarityScore();
  // take into account the monotonicity of the
  // board
  var monotoneScore = Math.max(1, this.grid.monotoneBoardScore());
  //console.log("monotone "+monotoneScore)
  return emptyCells*max*boardSim*monotoneScore;
};

AI.prototype.greedyEval = function () {
  bestMove = -1;
  bestScore = 0;
  for (var direction in [0, 1, 2, 3]) {
    var newGrid = this.grid.clone();
    if (newGrid.move(direction).moved){
      var newAI = new AI(newGrid);
      var newScore = newAI.eval();
      if (newScore > bestScore) {
        bestScore = newScore;
        bestMove = direction;
      }
    }
  }
  return {
    score: bestScore,
    move: bestMove
  }
}

AI.prototype.ignoreAdversary = function (depth) {
  bestMove = -1;
  bestScore = 0;
  if (depth == 0) {
    return {
      score: this.eval()
    }
  }
  for (var direction in [0,1,2,3]) {
      var newGrid = this.grid.clone();
      if (newGrid.move(direction).moved){
        var newAI = new AI(newGrid);
        // ignore the adversary.
        newAI.grid.playerTurn = true;
        var newScore = newAI.ignoreAdversary(depth - 1).score;
        if (newScore > bestScore) {
          bestScore = newScore;
          bestMove = direction;
        }
      }
  }
  return {
      score: bestScore,
      move: bestMove
  }
}

AI.prototype.fullyRandom = function(){
  var moved = false;
  var randDirection;
  while (!moved) {
    randDirection = Math.floor((Math.random() * 4))
    if (randDirection == 4) randDirection = 3;
    var newGrid = this.grid.clone();
    moved = newGrid.move(randDirection);
  }
  return {move: randDirection}
}

AI.prototype.partiallyRandom = function (){
  var moved = false;
  var randDirection;
  while (!moved) {
    // don't move up.
    randDirection = Math.floor((Math.random() * 4) + 1)
    if (randDirection == 4) randDirection = 3;
    var newGrid = this.grid.clone();
    moved = newGrid.move(randDirection);
  }
  return {move: randDirection}
}

AI.prototype.greedyScore = function (depth, carryOver) {
  var bestScore = carryOver;
  var bestMove = -1;
  if (this.grid.playerTurn) {
    if (depth == 0) {
      return {
        score: carryOver
      }
    }
    for (var direction in [0, 1, 2, 3]) {
      var newGrid = this.grid.clone();
      var performedMove = newGrid.move(direction);
      if (performedMove.moved){
        var newAI = new AI(newGrid);
        //console.log(performedMove.score);
        var resultScore = performedMove.score;
        var newScore = newAI.greedyScore(depth - 1, carryOver+resultScore).score;
        if (newScore > bestScore) {
          bestScore = newScore;
          //console.log(bestScore);
          bestMove = direction;
        }
      }
    }
    return {
      score: bestScore,
      move: bestMove
    }
  }
  else {
    var score = 0;
    this.grid.playerTurn = true;
    // Get the available (empty) cells in the grid
    var cells = this.grid.availableCells();

    // Tile to be inserted could be a 2 or a 4
    for (var value in [2, 4]) {

      // Loop through the empty cells
      for (var i in cells) {

        // Create and insert a new tile with the given number
        var cell = cells[i];
        //console.log(cell);
        var tile = new Tile(cell, parseInt(value, 10));
        //console.log(tile);
        this.grid.insertTile(tile);
        //console.log(this.grid);

        // Calculate the value of this board
        var newScore = this.greedyScore(depth, carryOver).score;
        //console.log(newScore);
        // The value to add to the total score is the probability that the value
        // is chosen (prob of 2 or prob of 4) multiplied by the probability that
        // that cell is chosen (each cell has equal probability) times the score
        // of the new board
        //console.log(1/intToFloat(cells.length));
        // Remove the cell so that everything is back to how it started
        if (newScore > score) {
          score = newScore;
        }
        this.grid.removeTile(cell);
      }
    }
    // Not sure if the return value is correct
    return {
      score: score
    }
  }
}

//
// Expectiminimax algorithm
//
AI.prototype.expectiminimax = function (depth, alpha) {
  //console.log(this.grid.playerTurn)
  //console.log(depth);
  if (this.grid.playerTurn) {
    //this.grid.playerTurn = false;
    // It's the AI's turn to play (max)
    if (depth <= 0) {
      // Don't go any deeper, just run the heuristic
      return {
        score: this.eval()
      }
    } else {
      var move = -1;
      // Loop through the allowed moves (up, down, left right)
      for (var direction in [0, 1, 2, 3]) {
        // Clone the grid and make the move on it
        var newGrid = this.grid.clone();
        var resMove = newGrid.move(direction);
        
        if (resMove.moved) {
          // Move was successful
          // Check if the value of this new board is greater than the cached
          // value stored in score

          // Check the value of the board by makinga new AI with that board and
          // then running the expectiminimax algo on it
          var newAI = new AI(newGrid);
          var mergeScore = Math.max(1,fastLog(resMove.score));
          //console.log(mergeScore);
          var newScore = newAI.expectiminimax(depth - 1, alpha).score * mergeScore;
          //console.log(newScore);
          // If the new score is greater than the previous one, update the
          // score and direction required to get that score
          if (newScore > alpha) {
            alpha = newScore;
            move = direction;
          }
        }
      }
      return {
        score: alpha,
        move: move
      }
    }
  } else {
    this.grid.playerTurn = true;
    // It's the computer's turn, i.e. the random addition of a 2 tile or 4 tile
    // This is the min player
    var score = 0;
    // Get the available (empty) cells in the grid
    var cells = this.grid.availableCells();

    // Tile to be inserted could be a 2 or a 4
    for (var value in [2, 4]) {

      // Loop through the empty cells
      for (var i in cells) {

        // Create and insert a new tile with the given number
        var cell = cells[i];
        //console.log(cell);
        var tile = new Tile(cell, parseInt(value, 10));
        //console.log(tile);
        this.grid.insertTile(tile);
        //console.log(this.grid);

        // Calculate the value of this board
        var newScore = this.expectiminimax(depth, alpha).score;
        //console.log(newScore);
        // The value to add to the total score is the probability that the value
        // is chosen (prob of 2 or prob of 4) multiplied by the probability that
        // that cell is chosen (each cell has equal probability) times the score
        // of the new board
        //console.log(1/intToFloat(cells.length));
        score += this.grid.probabilityOfNewTile(value) * newScore * (1 / intToFloat(cells.length));
        //console.log(score);
        // Remove the cell so that everything is back to how it started
        this.grid.removeTile(cell);
      }
      // if this score is less than the beta threshold, going to 4
      // isn't really going to help
      if (score < BETA_THRESHOLD) {
        break;
      }
    }
    // Not sure if the return value is correct
    return {
      score: score
    }
  }
}


/***************************** DEPTH LIMITED SEARCH ****************************

Implements a recursive depth-limited depth first search. d is the depth limit
Inv: depth >= 0
********************************************************************************/
AI.prototype.dls = function(depth, alpha, beta) {
  var bestMove = -1;
  if (this.grid.playerTurn) {
    
    //Base Case
    if (depth == 0) {return {score: this.eval()}}

    //Recursive Case
    else {
      for (var direction in [0, 1, 2, 3]) {
        //console.log("direction "+direction)
        var newGrid = this.grid.clone();
        var gridMove = newGrid.move(direction)
        if (gridMove.moved) { // Move was successful

          // Check the value of the next-depth board 
          var newAI = new AI(newGrid);
          var newScore = newAI.dls(depth - 1, alpha, beta).score;
          //console.log("direction "+direction+" score "+newScore)
          // If the new score is greater than the previous one, update the
          // score and direction required to get that score
          if (newScore > alpha) {
            alpha = newScore;
            bestMove = direction;
          }
          if (beta <= alpha) {
            break
          }
        }
      }
      return {
        score: alpha,
        move: bestMove
      }
    }
  }

  //Computer's Turn
  //Will Iterate through adding 2 or 4 to each empty cell of the board
  else {
    this.grid.playerTurn = true;
    var cells = this.grid.availableCells()
    for (i in cells) {
      var cell = cells[i];

      for (var newTileNumber in [2, 4]) {
        var tile = new Tile(cell, parseInt(newTileNumber, 10));
        this.grid.insertTile(tile);
        //Evaluate this new board
        var newScore = this.dls(depth, alpha, beta).score;
        if (newScore < beta) {beta = newScore;}
        // Remove the cell so that everything is back to how it started
        this.grid.removeTile(cell);
        if (beta <= alpha) {
          break;
        }
      }
    }
    
    return {score: beta}
  }
}

// performs a search and returns the best move
AI.prototype.getBest = function() {
  //var res = this.greedyScore(1,0);
  //console.log(res.move);
  //if (res.move == -1) {
  //  // nothing can be merged...
  //  return this.fullyRandom();
  //}
  //else return res;
  return this.expectiminimax(3, -1000);
  //return this.iterativeDeep();
  //return this.greedyEval()
  //return res;
}

// performs iterative deepening over the depth-limited search
AI.prototype.iterativeDeep = function() {
  var start = (new Date()).getTime();
  var depth = 0;
  var best;
  do {
    //var newBest = this.ignoreAdversary(depth);
    var newBest = this.dls(depth, -1000, 1000);
    //var newBest = this.greedyScore(depth,0)
    //var newBest = this.expectiminimax(depth, -1000);
    if (newBest.move == -1) {
      //console.log('BREAKING EARLY');
      break;
    } else {
      best = newBest;
    }
    depth++;
  } while ( (new Date()).getTime() - start < minSearchTime);
  //console.log('depth', --depth);
  //console.log(this.translate(best.move));
  //console.log(best);
  return best
}

AI.prototype.translate = function(move) {
 return {
    0: 'up',
    1: 'right',
    2: 'down',
    3: 'left'
  }[move];
}

