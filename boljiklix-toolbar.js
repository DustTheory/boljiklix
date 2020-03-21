// ==UserScript==
// @name        BoljiKlix Toolbar - klix.ba
// @namespace   Violentmonkey Scripts
// @match       https://www.klix.ba/*
// @grant GM_getValue
// @grant GM_setValue
// @version     0.0.3
// @author      ishakd00
// @description 3/20/2020, 21:31:00 PM
// ==/UserScript==

$("head").append(`
<style>

.main-view {
  padding-top: 90px;
}

.fa, .far, .fas {
	font-family: "Font Awesome 5 Free"!important;
}

.boljiklix-toolbar {
  width: 100%;
  height: 30px;
  
  background-color: white;
}

.boljiklix-toolbar * {
	display: inline-block;
}

.boljiklix-notifications {
  display: none;
  position: fixed;
  z-index: 999;
  top: 90px;
  left: 30px;
  
  width: 300px;
  padding: 10px;

  background-color: white;
}

.boljiklix-threadwatcher {
  display: none;
  position: fixed;
  z-index: 999;
  top: 90px;
  right: 30px;
  
  width: 300px;
  padding: 10px;

  background-color: white;
}

.boljiklix-settings {
  display: none;
	position: fixed;
	z-index: 999;
	
	width: 500px;
	height: 500px;

	top: 50%;
	left: 50%;
	margin-top: -250px; /* Negative half of height. */
	margin-left: -250px; /* Negative half of width. */

	background-color: white;
	padding: 30px;
}

.bk-notification {

}


</style>
`);

$("head").append(`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.1/css/all.min.css" integrity="sha256-mmgLkCYLUQbXn0B1SRqzHar6dCnv9oZFPEC1g1cwlkk=" crossorigin="anonymous" />`);

let toolbarTemplate = `
<div class="boljiklix-toolbar">
  <button class="bk-tb-refresh-btn" ><i class="fas fa-sync"></i></button>
  <div class="bk-refresh-status">
  	<span class="bk-refresh-status-last-refresh">?</span> / <span class="bk-refresh-status-next-refresh-counter">?</span>
  </div>
  <button class="bk-tb-notifications-btn" ><i class="far fa-bell"></i></button>
  <span id="bk-notifications-label">13</span>
  <button class="bk-tb-settings-btn" ><i class="fas fa-cog"></i></button>
  <button class="bk-tb-threadwatcher-btn"><i class="fas fa-eye"></i></button>
</div>
`;

let notificationsTemplate = `
<div class="boljiklix-notifications">
</div>
`;

let threadwatcherTemplate = `
<div class="boljiklix-threadwatcher">
</div>
`;


let settingsTemplate = `
<div class="boljiklix-settings">
	<p>Koliko najmanje zadnjih komentara treba provjeriti za notifikacije</p>
	<input type="number" id="bk-settings-tb-min-comments">
	<p>Koliko najvise zadnjih komentara treba provjeriti za notifikacije</p>
	<input type="number" id="bk-settings-tb-max-comments">
	<p>Koliko nazad u vrijeme treba provjeriti moje komentare za notifikacije. Nikada nece biti vise od maksilalnog broja ili minimalnog broja komentara unesenih iznad</p>
	<input type="number" id="bk-settings-tb-load-up-until-ago">
	<select id="bk-settings-tb-load-up-until-ago-unit">
		<option value="seconds">Sekundi</option>
		<option value="minutes">Minuta</option>
		<option value="hours">Sati</option>
		<option value="days">Dana</option>
	</select>
	<p>Automatski osvjezi svakih:</p>
	<input type="number" id="bk-settings-auto-refresh-interval">
	<select id="bk-settings-auto-refresh-interval-unit">
		<option value="seconds">Sekundi</option>
		<option value="minutes">Minuta</option>
		<option value="hours">Sati</option>
		<option value="days">Dana</option>
	</select>
	<p>Moje komentare i odgovore automatski dodaj na pratitelj komentara.</p>
	<input type="checkbox" id="bk-settings-watch-thread-on-comment">
	<p>Nakon koliko vremena neaktivnosti treba izbaciti komentar iz pratitelja komentara.</p>
	<input type="number" id="bk-settings-tb-thread-watcher-expiry-time">
	<select id="bk-settings-tb-thread-watcher-expiry-time-unit">
		<option value="seconds">Sekundi</option>
		<option value="minutes">Minuta</option>
		<option value="hours">Sati</option>
		<option value="days">Dana</option>
	</select>
	<br/>
	<button id="bk-settings-save-btn">Spasi promjene</button>
</div>
`;


function generateNotification(type, commentId, valueChange, responseData){
	let notificationData = encodeURIComponent(JSON.stringify({
		type: type,
		commentId: commentId,
		valueChange: valueChange
	}));
	let notificationText;
	if(type == 'rateup')
		notificationText = `Vas post ${commentId} je dobio ${valueChange} lajkova`;
	else if(type == 'ratedown')
		notificationText = `Vas post ${commentId} je dobio ${valueChange} dislajkova`;
	else if(type == 'response')
		notificationText = `${responseData.responderUsername} je odgovorio na vas post ${commentId}: ${responseData.responseText}`;
	return `
		<div data-notificationdata="${notificationData}" class="bk-notification">
			<a href="#">${notificationText}</a>
			<a class="bk-delete-notification-btn" href="#">Ukloni</a>
		</div>
	`;
}

function generateThreadwatcherThread(comment, numRespnses, numResponsesChange){
  return `
  		<div class="bk-threadwatcher-thread">
			<a href="#">
      <span class="${numresponsesChange > 0 ? 'green': ''}">
      ${numResponses} (+${numResponseChange})
      </span>
      ${comment}
      </a>
			<a class="bk-delete-thread-btn" href="#">Ukloni</a>
		</div>
`
}

async function refresh() {
	await refreshComments();
	await refreshNotifications();
	await refreshThreadWatcher();
}

async function refreshComments() {

}

async function refreshThreadWatcher(){
  let threadwatcherData = await GM_getValue("boljiklix-threadwatcher", {});
  threadwatcher.empty();
  for(threadId  in threadwatcherData){
    let thread = threadwatcherData[threadId];
    let responses = await getNewResponses(threadId, thread.lastResponse);
    let numResponses = thread.brojOdgovora;
    if(!responses)
      console.log('err', thread);
    else
      numResponses += responses.length;
    let threadElement = $(generateThreadwatcherThread(thread.komentar, numResponses, numResponses-thread.numResponses)).appendTo(threadwatcher);    
    threadElement.find(".bk-delete-thread-btn").click(async ()=>{
      threadElement.remove();
      let threadwatcherData = await GM_getValue("boljiklix-threadwatcher", {});
      delete threadwatcherData[threadId];
    });
  }
}


function getMyUsername() {
	let usernameLink = $(".username-link");
	if (!usernameLink)
		return false;
	return usernameLink.attr('href').split('profil/').slice(-1)[0];
}

async function refreshNotifications() {
	let newRateUps = {};
	let newRateDowns = {};
	let newResponses = [];
	let commentsList = await getMyCommentsList();
	let oldCommentsList = await GM_getValue("boljiklix-myOldComments", {});
	await Promise.all(commentsList.map(async (comment) => {
		if (comment.id == -1)
			return;
		let oldComment = oldCommentsList[comment.id];
		if (!oldComment) {
			let newCommentResponses = [];
			if (comment.tip == 'komentar')
				newCommentResponses = await getNewResponses(comment.id, new Date(0));

			oldCommentsList[comment.id] = {
				id: comment.id,
				rateup: comment.rateup,
				ratedown: comment.ratedown,
				brojOdgovora: comment.brojOdgovora || 0,
				zadnjiOdgovorDatum: newCommentResponses.length ? new Date(newCommentResponses[0].datum) : new Date(0)
			}
			return;
		} 
		if (comment.rateup > oldComment.rateup) 
			newRateUps[comment.id] = comment.rateup - oldComment.rateup;
		
		if (comment.ratedown > oldComment.ratedown) 
			newRateDowns[comment.id] = comment.ratedown - oldComment.ratedown;
		
		if (comment.brojOdgovora > oldComment.brojOdgovora) {
			let newCommentResponses = await getNewResponses(comment.id, oldComment.zadnjiOdgovorDatum);
			newCommentResponses.forEach(commentResponse => {
				newResponses.push([comment.id, commentResponse]);
			});
		}
	}));
	renderNotifications(newRateUps, newRateDowns, newResponses, new Date());
};

async function getNewResponses(commentId, lastResponse) {
	let result = await $.ajax({
		url: "https://api.klix.ba/v1/komentar/" + commentId,
	});
  if(!result.odgovori)
    return;
	result.odgovori.filter(odg => {
		return new Date(odg.datum) >= lastResponse;
	});
	return result.odgovori;
}

async function getMyCommentsList() {
	if(!boljiklixSettings)
		await loadSettings();
	let username = getMyUsername();
	if (!username)
		return;
	let comments = [];
	while(comments.length < boljiklixSettings.toolbarMaxComments && (comments.length < boljiklixSettings.toolbarMinComments || new Date(comments[comments.length - 1].datum) >= boljiklixSettings.toolbarEarliestDate())){
		let lastId = comments.length ? comments[comments.length-1].id : undefined;
		let newComments = await getNextCommentsPage(username, lastId);
		if(!newComments)
			break;
		for (let i = 0; i < newComments.length; i++)
			comments.push(newComments[i]);
	}
	return comments;
}

async function getNextCommentsPage(username, lastId) {
	let result =  await $.ajax({
		url: `https://api.klix.ba/v1/komentari/${username}?lastID=${lastId}}`
	});
	return result.komentari;
}

function toggleNotifications(){
	notifications.toggle();
}

function toggleSettings(){
	settings.toggle();
}

function toggleThreadwatcher(){
	threadwatcher.toggle();
}


async function renderNotifications(rateUps, rateDowns, responses, lastRefresh) {
	bkLastRefresh = lastRefresh;
	notifications.empty();
	for(ru in rateUps)
		notifications.append(generateNotification('rateup', ru, rateUps[ru]));
	for(rd in rateDowns)
		notifications.append(generateNotification('ratedown', rd, rateDowns[rd]));
	responses.forEach(response => {
		notifications.append(generateNotification('response', response[0], 1, {
			responderUsername: response[1].username,
			responseText: response[1].komentar
		}));
	});
	notificationsLabel.text(notifications.children('.bk-notification').length);
	await GM_setValue("boljiklix-notifications", {
		rateUps: rateUps,
		rateDowns: rateDowns,
		responses: responses,
		lastRefresh: lastRefresh
	});
}

async function loadNotifications(){
	let notifications = await GM_getValue("boljiklix-notifications", {
		rateUps: {},
		rateDowns: {},
		responses: [],
		lastRefresh: new Date()
	});
	let rateUps = notifications.rateUps;
	let rateDowns = notifications.rateDowns;
	let responses = notifications.responses;
	renderNotifications(rateUps, rateDowns, responses, notifications.lastRefresh);
}

async function loadSettings(){
	let settings = await GM_getValue("boljiklix-settings", {
		toolbarMinComments: 20,
		toolbarMaxComments: 100,
		toolbarLoadUpUntilAgo: 1000*60*60*24*7,
		toolbarEarliestDate: function(){
			return new Date() - settings.toolbarLoadUpUntilAgo;
		},
		
		autoRefreshInterval: 1000*60,

		watchThreadOnComment: true,
		threadWatcherThreadExpiryTime: 1000*60*60*24*7
	});
	boljiklixSettings = settings;
	let minCommentsInput = $('#bk-settings-tb-min-comments');
	let maxCommentsInput = $('#bk-settings-tb-max-comments');
	let loadUpUntilAgoInput = $("#bk-settings-tb-load-up-until-ago");
	let loadUpUntilAgoUnitSelect = $("#bk-settings-tb-load-up-until-ago-unit");
	let autoRefreshIntervalInput = $("#bk-settings-auto-refresh-interval");
	let autoRefreshIntervalUnitSelect = $("#bk-settings-auto-refresh-interval-unit");
	let watchThreadOnCommentCheckbox = $("#bk-settings-watch-thread-on-comment");
	let threadWatcherExpiryTimeInput = $("#bk-settings-tb-thread-watcher-expiry-time");
	let threadWatcherExpiryTimeUnitSelect = $("#bk-settings-tb-thread-watcher-expiry-time-unit");

	minCommentsInput.val(settings.toolbarMinComments);
	maxCommentsInput.val(settings.toolbarMaxComments);

	let luuaTimeAndUnit = convertTimeToUnit(settings.toolbarLoadUpUntilAgo);
	loadUpUntilAgoInput.val(luuaTimeAndUnit.time);
	loadUpUntilAgoUnitSelect.val(luuaTimeAndUnit.unit);

	let ariTimeAndUnit = convertTimeToUnit(settings.autoRefreshInterval);
	autoRefreshIntervalInput.val(ariTimeAndUnit.time);
	autoRefreshIntervalUnitSelect.val(ariTimeAndUnit.unit);

	watchThreadOnCommentCheckbox.prop('checked', settings.watchThreadOnComment);

	let twetTimeAndUnit = convertTimeToUnit(settings.threadWatcherThreadExpiryTime)
	threadWatcherExpiryTimeInput.val(twetTimeAndUnit.time);
	threadWatcherExpiryTimeUnitSelect.val(twetTimeAndUnit.unit);
}

async function saveSettings(){
	let settings = await GM_getValue("boljiklix-settings", {
		toolbarMinComments: 20,
		toolbarMaxComments: 100,
		toolbarLoadUpUntilAgo: 1000*60*60*24*7,
		toolbarEarliestDate: function(){
			return new Date() - settings.toolbarLoadUpUntilAgo;
		},
		
		autoRefreshInterval: 1000*60,

		watchThreadOnComment: true,
		threadWatcherThreadExpiryTime: 1000*60*60*24*7
	});

	let minCommentsInput = $('#bk-settings-tb-min-comments');
	let maxCommentsInput = $('#bk-settings-tb-max-comments');
	let loadUpUntilAgoInput = $("#bk-settings-tb-load-up-until-ago");
	let loadUpUntilAgoUnitSelect = $("#bk-settings-tb-load-up-until-ago-unit");
	let autoRefreshIntervalInput = $("#bk-settings-auto-refresh-interval");
	let autoRefreshIntervalUnitSelect = $("#bk-settings-auto-refresh-interval-unit");
	let watchThreadOnCommentCheckbox = $("#bk-settings-watch-thread-on-comment");
	let threadWatcherExpiryTimeInput = $("#bk-settings-tb-thread-watcher-expiry-time");
	let threadWatcherExpiryTimeUnitSelect = $("#bk-settings-tb-thread-watcher-expiry-time-unit");

	if(isNaN(minCommentsInput.val()))
		console.log('ERROR: minCommentsInput NaN');
	else
		settings.toolbarMinComments = parseInt(minCommentsInput.val());

	if(isNaN(maxCommentsInput.val()))
		console.log('ERROR: maxCommentsInput NaN');
	else
		settings.toolbarMaxComments = parseInt(maxCommentsInput.val());

	if(isNaN(loadUpUntilAgoInput.val()))
		console.log('ERROR: loadUpUntilAgo NaN');
	else
		settings.toolbarLoadUpUntilAgo = convertTimeFromUnit(loadUpUntilAgoInput.val(), loadUpUntilAgoUnitSelect.val());
	
	if(isNaN(autoRefreshIntervalInput.val()))
		console.log('ERROR: autoRefreshInterval NaN');
	else
		settings.autoRefreshInterval = convertTimeFromUnit(autoRefreshIntervalInput.val(), autoRefreshIntervalUnitSelect.val());

	settings.watchThreadOnComment = watchThreadOnCommentCheckbox.prop('checked');

	if(isNaN(threadWatcherExpiryTimeInput.val()))
		console.log('ERROR: threadWatcherExpiryTime NaN');
	else
		settings.threadWatcherThreadExpiryTime = convertTimeFromUnit(threadWatcherExpiryTimeInput.val(), threadWatcherExpiryTimeUnitSelect.val());

	await GM_setValue("boljiklix-settings", settings);
	boljiklixSettings = settings;
	console.log('saved');
}

function convertTimeFromUnit(time, unit){
	let unitConversionMultipliers = {
		'seconds': 1000,
		'minutes': 1000*60,
		'hours': 1000*60*60,
		'days': 1000*60*60*24
	}
	return time*unitConversionMultipliers[unit];
}

function convertTimeToUnit(time){
  if(time < 0)
		return {
			time: -1,
			unit: 'seconds'
		}
	if(time >= 1000*60*60*24)
		return {
			time: time / (1000*60*60*24),
			unit: 'days'
		};
	if(time >= 1000*60*60)
		return {
			time: time / (1000*60*60),
			unit: 'hours'
		};
	if(time >= 1000*60)
		return {
			time: time / (1000*60),
			unit: 'minutes'
		};
	return {
		time: time / 1000,
		unit: 'seconds'
	};
}
let bkLastRefresh;
let toolbar = $(toolbarTemplate).appendTo("header");
let notifications = $(notificationsTemplate).appendTo("body");
let settings = $(settingsTemplate).appendTo("body");
let threadwatcher = $(threadwatcherTemplate).appendTo("body");
let boljiklixSettings;

let notificationsLabel = $(".bk-notifications-label");
$(".bk-tb-refresh-btn").click(refresh);
$(".bk-tb-notifications-btn").click(toggleNotifications);
$(".bk-tb-settings-btn").click(toggleSettings);
$(".bk-tb-threadwatcher-btn").click(toggleThreadwatcher);
$("#bk-settings-save-btn").click(saveSettings);

loadNotifications();
loadSettings();

$(document).on('click', '.bk-delete-notification-btn', async function(e){
	let notification = $(e.target).closest('.bk-notification');
	let notificationData = JSON.parse(decodeURIComponent(notification.attr('data-notificationdata')));
	console.log(notificationData);
	console.log(notification);
	let oldCommentsList = await GM_getValue("boljiklix-myOldComments");
	if(!oldCommentsList)
		return console.log('ERROR');
	if(notificationData.type == 'rateup')
		oldCommentsList[notificationData.commentId].rateup += notificationData.valueChange
	else if(notificationData.type == 'ratedown')
		oldCommentsList[notificationData.commentId].ratedown += notificationData.valueChange
	else if(notificationData.type == 'response')
		oldCommentsList[notificationData.commentId].brojOdgovora += notificationData.valueChange
	notification.remove();
	await GM_setValue("boljiklix-myOldComments", oldCommentsList);
});

async function autoRefreshTimerTick(){
	if(!boljiklixSettings)
		await loadSettings();
	let lastRefreshSpan = $(".bk-refresh-status-last-refresh");
	let nextRefreshCounterSpan = $(".bk-refresh-status-next-refresh-counter");
	let currTime = new Date();
	console.log(currTime);
	console.log(bkLastRefresh);
	let timeSinceLastRefresh = currTime.getTime() - new Date(bkLastRefresh).getTime();
	let timeUntilNextRefresh = convertTimeToUnit(boljiklixSettings.autoRefreshInterval - timeSinceLastRefresh);
  timeSinceLastRefresh = convertTimeToUnit(timeSinceLastRefresh);
	let shortVersion = {
		'seconds': 'sek',
		'minutes': 'min',
		'hours': 'sat',
		'days': 'dan'
	};
  console.log(timeUntilNextRefresh);
	let lastRefreshStr = `${Math.round(timeSinceLastRefresh.time)} ${shortVersion[timeSinceLastRefresh.unit]}`;
	let nextRefreshStr = `${Math.round(timeUntilNextRefresh.time)} ${shortVersion[timeUntilNextRefresh.unit]}`;
	lastRefreshSpan.text(lastRefreshStr);
	if(timeUntilNextRefresh.time <= 0){
		nextRefreshCounterSpan.text('0 sek');
    refresh();
	} else {
		nextRefreshCounterSpan.text(nextRefreshStr);
	}
}

setInterval(autoRefreshTimerTick, 1000);
