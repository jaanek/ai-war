const GameRound = artifacts.require("./GameRound.sol");
const TicTacToeGameContract = artifacts.require("./TicTacToeGame.sol");
const TicTacToeGame = require('../sdk/games/tictactoe_game.js');

contract('GameRound test cases', function(accounts) {
    const MAXIMUM_BET_SIZE_FOR_ALL = 100;
    const INITIAL_MAXIMUM_BET_SIZE = 10;
    const INITIAL_BET_SIZE = 1;
    let game;
    let round;
    let player1 = accounts[0];
    let player2 = accounts[1];
    let creator = accounts[2];
    let gasCounter = {};

    function countGas(params, gasUsed) {
        let from = params.from || accounts[0];
        if (from in gasCounter) {
            gasCounter[from] += gasUsed;
        } else {
            gasCounter[from] = gasUsed;
        }
    }
    async function createContract(topic, contract) {
        let params = arguments[arguments.length-1];
        let instance = await contract.new.apply(contract, Array.from(arguments).slice(2));
        let txHash = instance.contract.transactionHash;
        let txReceipt = await web3.eth.getTransactionReceipt(txHash);
        let gasUsed = txReceipt.gasUsed;
        console.log(`${topic}: gasUsed ${gasUsed}`);
        countGas(params, gasUsed);
        return instance;
    }

    async function sendTransaction(topic, f) {
        let params = arguments[arguments.length-1];
        let tx = await f.apply(null, Array.from(arguments).slice(2));
        let gasUsed = tx.receipt.gasUsed;
        console.log(`${topic}: gasUsed ${gasUsed}`);
        countGas(params, gasUsed);
    }

    function decodeMoveData(moveData) {
        return '0b' + moveData.toString(2).padStart(4, "0");
    }

    async function digestGameRoundStatus(round) {
        let syncedTurn = (await round.syncedTurn.call()).toNumber();
        let gameOverReason = (await round.gameOverReason.call()).toNumber();
        let causingSide = (await round.causingSide.call()).toNumber();
        console.log(`------------------------------------------------------`);
        console.log(`Round synced turn at ${syncedTurn}`);
        gameData = await round.gameData.call();
        TicTacToeGame.printGameData(gameData);
        if (gameOverReason) {
            gameOverReasonStr = await game.decodeGameOverReason.call(gameOverReason);
            console.log(`Game over caused by player ${causingSide}: ${gameOverReasonStr}`);
        }
        console.log(`------------------------------------------------------`);
        return {syncedTurn, gameOverReason, causingSide};
    }

    before(async function () {
        game = await createContract("TicTacToeGame created", TicTacToeGameContract, { from: creator, gas: 2000000 });
        // reset gas counter
        gasCounter = {};
    })

    beforeEach(async function () {
        round = await createContract("GameRound created", GameRound, 0, game.address, MAXIMUM_BET_SIZE_FOR_ALL, { from: creator, gas: 2000000 });
        await sendTransaction('round.setPlayer 1', round.setPlayer,
            1, player1, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, { from: creator });
        await sendTransaction('round.setPlayer 2', round.setPlayer,
            2, player2, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, { from: creator });
        await sendTransaction('round.start', round.start, { from: creator });
    })

    afterEach(async function () {
        console.log(`creator used gas ${gasCounter[creator]}`);
        console.log(`player1 used gas ${gasCounter[player1]}`);
        console.log(`player2 used gas ${gasCounter[player2]}`);
        gasCounter = {};
    })

    it("a typical tictactoe game round", async function() {
        let move;
        let gameData;

        let moveData1 = TicTacToeGame.createMoveData(1, 1);
        await sendTransaction(`round.makeMove 1 ${decodeMoveData(moveData1)}`, round.makeMove,
            1, moveData1, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0, { from: player1 });
        move = await round.getMove.call(0);
        assert.equal(move[0].toNumber(), 1);
        assert.equal(move[1].toNumber(), moveData1);

        let moveData2 = TicTacToeGame.createMoveData(2, 2);
        await sendTransaction(`round.makeMove 2 ${decodeMoveData(moveData2)}`, round.makeMove,
            2, moveData2, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player2 });
        move = await round.getMove.call(1);
        assert.equal(move[0].toNumber(), 2);
        assert.equal(move[1].toNumber(), moveData2);

        //console.log("!! move 0", (await round.moves.call(0)).toNumber().toString(2).padStart(16, "0"));
        //console.log("!! move 1", (await round.moves.call(1)).toNumber().toString(2).padStart(16, "0"));
        let gameStatus;
        gameStatus = await digestGameRoundStatus(round);
        assert.equal(gameStatus.syncedTurn, 0);
        assert.equal(gameStatus.gameOverReason, 0);
        assert.equal(gameStatus.causingSide, 0);
        await sendTransaction("round.syncGameData 2", round.syncGameData, 2, { from: creator });
        gameStatus = await digestGameRoundStatus(round);
        assert.equal(gameStatus.syncedTurn, 2);
        assert.equal(gameStatus.gameOverReason, 0);
        assert.equal(gameStatus.causingSide, 0);

        let moveData3 = TicTacToeGame.createMoveData(0, 1);
        await sendTransaction(`round.makeMove 3 ${decodeMoveData(moveData3)}`, round.makeMove,
            1, moveData3, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player1 });

        let moveData4 = TicTacToeGame.createMoveData(2, 1);
        await sendTransaction(`round.makeMove 4 ${decodeMoveData(moveData4)}`, round.makeMove,
            2, moveData4, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player2 });

        let moveData5 = TicTacToeGame.createMoveData(0, 2);
        await sendTransaction(`round.makeMove 5 ${decodeMoveData(moveData5)}`, round.makeMove,
            1, moveData5, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player1 });

        let moveData6 = TicTacToeGame.createMoveData(2, 0);
        await sendTransaction(`round.makeMove 4 ${decodeMoveData(moveData6)}`, round.makeMove,
            2, moveData6, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player2 });

        await sendTransaction("round.syncGameData 6", round.syncGameData, 6, { from: creator });
        gameStatus = await digestGameRoundStatus(round);
        assert.equal(gameStatus.syncedTurn, 6);
        assert.equal(gameStatus.gameOverReason, 1);
        assert.equal(gameStatus.causingSide, 2);
    })
});
