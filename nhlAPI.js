const axios = require('axios');
var schedule = require('node-schedule');
const player = require('play-sound')();

const teamID = 23 // Vancouver Canucks: 23
const baseURL = 'https://statsapi.web.nhl.com'
const urlNextGame = 'https://statsapi.web.nhl.com/api/v1/teams/' + teamID + '?expand=team.schedule.next'

var currentGame;
var currentPlayID = 0;
var scheduledGame;

// Check for a new game every hour
var checkGames = schedule.scheduleJob('0 * * * *', function() {
	if (!currentGame) {
		console.log('[sys] Check for Next Game: %s', new Date())

		getNextGame().then(function(response) {
			console.log('[sys] Next Game Date: %s', response.gameDate)
			currentGame = response

			// let startTime = new Date(response.gameDate)
			let startTime = new Date()
			let endTime = new Date(startTime.getTime() + 6 * 3600 * 1000) // 4 * 3600 * 1000
			scheduledGame = schedule.scheduleJob({ start: startTime, end: endTime, rule: '* * * * * *' }, function() {
				gameLiveFeed(currentGame)
			});
			/*
			var scheduleGameWatch = schedule.scheduleJob(date, function(msg) {
				console.log(msg)
				gameLiveFeed(currentGame)
			}.bind(null, '[s] Game Starting'))
			*/
		})
	}

	// If the scheduled game is finished, set current game to finished so that the next day it'll check to schedule the next game
	else {
		if (scheduledGame.nextInvocation() == null) {
			gameEnd()
		}
	}
})

function gameEnd() {
	currentGame = null
	currentPlayID = 0
	console.log('[s] %s', 'Cleared Finished Game')
	scheduledGame.cancel()
}

async function getNextGame() {
	const response = await axios.get(urlNextGame)
    return response.data.teams[0].nextGameSchedule.dates[0].games[0]
}

async function gameLiveFeed(game) {
	axios.get(baseURL + game.link) // '/api/v1/game/2017020001/feed/live'
		.then(response => {
			let plays = response.data.liveData.plays.allPlays

			for (let index = 0; index < plays.length; index++) {
				if (plays[index].about.eventIdx > currentPlayID) {
					currentPlayID = plays[index].about.eventIdx

					if (plays[index].result.event === 'Goal') {
						console.log('[game] %s: %o', plays[index].result.event, plays[index].team.name)
						if (plays[index].team.id != teamID) {
							console.log('[sys] Playing Goal Sound')
							player.play('./sound.mp3', (err) => {
								if (err) console.log(`Could not play sound: ${err}`)
							})
						}
					}
					else if (plays[index].result.event === 'Game End') {
						gameEnd()
						break
					}
					else if (!plays[index].team) {
						console.log('[game] %s: %o', plays[index].result.event, plays[index].result.event)
					}
					else {
						console.log('[game] %s: %o', plays[index].result.event, plays[index].team.name)
					}

					// TESTING BLOCK
					if (plays[index].result.event === 'Period End') {
						
						/*
						player.play('./sound.mp3', (err) => {
							if (err) console.log(`Could not play sound: ${err}`);
						});
						*/
					}
				}
			}
		})
		.catch(error => console.log(error))
}


function scoringPlays() {
	axios.get('https://statsapi.web.nhl.com/api/v1/game/2017020001/feed/live')
		.then(function(response) {
			response.data.liveData.plays.allPlays.forEach(play => {
				console.log(play.about.eventIdx)
			});
		})
}
//scoringPlays()