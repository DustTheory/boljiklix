// ==UserScript==
// @name        BoljiKlix 
// @namespace   Violentmonkey Scripts
// @match       https://www.klix.ba/*
// @grant GM_getValue
// @grant GM_setValue
// @version     0.0.1
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

.bk-green {
  color: green;
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


// Generates an html code string for a "bk-notification" element
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
  else if(type == 'admindeleted')
    notificationText = `Administrator kliksa je izbrisao vas post ${commentId};`;
	return `
		<div data-notificationdata="${notificationData}" class="bk-notification">
			<a class="bk-notification-text" href="/komentar/${commentId}">${notificationText}</a>
			<a class="bk-delete-notification-btn" href="#">Ukloni</a>
		</div>
	`;
}

// Generates an html code string for a "bk-threadwatcher-thread" element
function generateThreadwatcherThread(threadId, comment, numResponses, numResponsesChange){
  return `
  		<div class="bk-threadwatcher-thread" id="bk-threadwathcer-thread-${threadId}">
			<a class="bk-threadwatcher-thread-link" href="/komentar/${threadId}">
      <span class="${numResponsesChange > 0 ? 'bk-green': ''}">
      ${numResponses} (+${numResponsesChange})
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
	await refreshThreadwatcher();
}

async function refreshComments() {

}

// Updates threadwatcher with fresh data about watched threads
async function refreshThreadwatcher(){
  let threadwatcherData = await GM_getValue("boljiklix-threadwatcher", {});
  threadwatcher.empty();
  for(threadId  in threadwatcherData){
    let thread = threadwatcherData[threadId];
    let responses = await getNewResponses(threadId, new Date(thread.lastCheck));
    let numResponses = thread.brojOdgovora;
    numResponses += responses.length;
    getThreadwatcherThreadElement(threadId).remove();
    await createThreadwatcherThreadElement(thread, numResponses);
  }
}

// Creates threadwatcherThread element and appends it to the threadwatcher
async function createThreadwatcherThreadElement(thread, newNumResponses = 0){
 let numResponsesChange = newNumResponses - thread.brojOdgovora;
 let threadwatcherThreadElement = $(generateThreadwatcherThread(thread.id, thread.komentar, newNumResponses, numResponsesChange )).appendTo(threadwatcher);    
  threadwatcherThreadElement.find(".bk-delete-thread-btn").click(async (e) => {
    e.preventDefault();
    await unfollowThread(thread.id);
  });
  return threadwatcherThreadElement;
}

// Adds thread to threadwatcher
async function followThread(threadId){
  console.log(threadId);
  let threadwatcherData = await GM_getValue("boljiklix-threadwatcher", {});
  let thread = await getThread(threadId);
  thread.lastCheck = new Date();
  threadwatcherData[threadId] = thread;
  console.log(thread);
  await createThreadwatcherThreadElement(thread);
  console.log(threadwatcherData);
  await GM_setValue("boljiklix-threadwatcher", threadwatcherData);
}

async function updateThreadwatcherThreadStats(threadId){
  getThreadwatcherThreadElement(threadId).remove();
  await followThread(threadId);
}

// Returns the threadwatcherThread element inside threadwathcer with id
function getThreadwatcherThreadElement(threadId){
  return $(`#bk-threadwathcer-thread-${threadId}`);
}

// Removes thread from threadwatcher
async function unfollowThread(threadId){
    let threadwatcherData = await GM_getValue("boljiklix-threadwatcher", {});
    getThreadwatcherThreadElement(threadId).remove();
    delete threadwatcherData[threadId];
    await GM_setValue("boljiklix-threadwatcher", threadwatcherData);
}

// Updates the notifications element with fresh data about user's own comments
async function refreshNotifications() {
	let newRateUps = {};
	let newRateDowns = {};
	let newResponses = [];
  let adminDeleted = {};
  let username = getMyUsername();
	if (!username)
		return;
	let commentsList = await getMyCommentsList(username);
	let oldCommentsList = await GM_getValue("boljiklix-myOldComments", {});
  if(commentsList.length < Object.keys(oldCommentsList).length){
    let found = {};
    commentsList.forEach(comment => {
      found[comment.id] = true;
    });
    for(commentId in oldCommentsList){
      if(!found[commentId] && commentId != -1)
        adminDeleted[commentId] = true;
    }
  }
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
	renderNotifications(newRateUps, newRateDowns, newResponses, adminDeleted, new Date());
};

function getMyUsername() {
	let usernameLink = $(".username-link");
	if (!usernameLink)
		return false;
	return usernameLink.attr('href').split('profil/').slice(-1)[0];
}

// Given a commentId of a comment in a thread, returns the "komentar" object of the thread root comment
async function getThread(commentId){ 
  let result = await $.ajax({
		url: "https://api.klix.ba/v1/komentar/" + commentId,
	});
  return result;
}
  
// Given a commentId of a comment in a thread and a date, returns all responses to the the root comment of the thread posted later than the date passed
async function getNewResponses(commentId, lastResponse) {  
	let result = await getThread(commentId);
  if(!result.odgovori)
    return [];
	return result.odgovori.filter(odg => {
		return new Date(odg.datum) >= lastResponse;
	});
}

// Returns an array of comments by user ("komentar" objects). Number of comments returned is determined in boljiklixSettings.
async function getMyCommentsList(username) {
  if(!boljiklixSettings)
		await loadSettings();
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

// Use klix's api to grab the next batch of comments by user.
// if lastId is undefined it returns the latest batch of comments.
// otherwise returns the batch where lastId is 
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


async function renderNotifications(rateUps, rateDowns, responses, adminDeleted, lastRefresh) {
	bkLastRefresh = lastRefresh;
	notifications.empty();
	for(ru in rateUps)
		notifications.append(generateNotification('rateup', ru, rateUps[ru]));
	for(rd in rateDowns)
		notifications.append(generateNotification('ratedown', rd, rateDowns[rd]));
  for(ad in adminDeleted)
    notifications.append(generateNotification('admindeleted', ad, adminDeleted[ad]));
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
    adminDeleted: adminDeleted,
		lastRefresh: lastRefresh
	});
}

$(document).on('click', ".bk-notification .bk-notification-text", async (e) => {
  e.preventDefault();
  let url = $(e.target).attr('href');
  let notification = $(e.target).closest('.bk-notification');
	await deleteNotification(notification);
  window.location.href = url;
});

async function loadThreadwatcher(){
  await refreshThreadwatcher();
}

async function loadNotifications(){
	let notifications = await GM_getValue("boljiklix-notifications", {
		rateUps: {},
		rateDowns: {},
		responses: [],
    adminDeleted: {},
		lastRefresh: new Date()
	});
	let rateUps = notifications.rateUps;
	let rateDowns = notifications.rateDowns;
	let responses = notifications.responses;
  let adminDeleted = notifications.adminDeleted;
	renderNotifications(rateUps, rateDowns, responses, adminDeleted, notifications.lastRefresh);
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
		threadwatcherThreadExpiryTime: 1000*60*60*24*7
	});
	boljiklixSettings = settings;
	let minCommentsInput = $('#bk-settings-tb-min-comments');
	let maxCommentsInput = $('#bk-settings-tb-max-comments');
	let loadUpUntilAgoInput = $("#bk-settings-tb-load-up-until-ago");
	let loadUpUntilAgoUnitSelect = $("#bk-settings-tb-load-up-until-ago-unit");
	let autoRefreshIntervalInput = $("#bk-settings-auto-refresh-interval");
	let autoRefreshIntervalUnitSelect = $("#bk-settings-auto-refresh-interval-unit");
	let watchThreadOnCommentCheckbox = $("#bk-settings-watch-thread-on-comment");
	let threadwatcherExpiryTimeInput = $("#bk-settings-tb-thread-watcher-expiry-time");
	let threadwatcherExpiryTimeUnitSelect = $("#bk-settings-tb-thread-watcher-expiry-time-unit");

	minCommentsInput.val(settings.toolbarMinComments);
	maxCommentsInput.val(settings.toolbarMaxComments);

	let luuaTimeAndUnit = convertTimeToUnit(settings.toolbarLoadUpUntilAgo);
	loadUpUntilAgoInput.val(luuaTimeAndUnit.time);
	loadUpUntilAgoUnitSelect.val(luuaTimeAndUnit.unit);

	let ariTimeAndUnit = convertTimeToUnit(settings.autoRefreshInterval);
	autoRefreshIntervalInput.val(ariTimeAndUnit.time);
	autoRefreshIntervalUnitSelect.val(ariTimeAndUnit.unit);

	watchThreadOnCommentCheckbox.prop('checked', settings.watchThreadOnComment);

	let twetTimeAndUnit = convertTimeToUnit(settings.threadwatcherThreadExpiryTime)
	threadwatcherExpiryTimeInput.val(twetTimeAndUnit.time);
	threadwatcherExpiryTimeUnitSelect.val(twetTimeAndUnit.unit);
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
		threadwatcherThreadExpiryTime: 1000*60*60*24*7
	});

	let minCommentsInput = $('#bk-settings-tb-min-comments');
	let maxCommentsInput = $('#bk-settings-tb-max-comments');
	let loadUpUntilAgoInput = $("#bk-settings-tb-load-up-until-ago");
	let loadUpUntilAgoUnitSelect = $("#bk-settings-tb-load-up-until-ago-unit");
	let autoRefreshIntervalInput = $("#bk-settings-auto-refresh-interval");
	let autoRefreshIntervalUnitSelect = $("#bk-settings-auto-refresh-interval-unit");
	let watchThreadOnCommentCheckbox = $("#bk-settings-watch-thread-on-comment");
	let threadwatcherExpiryTimeInput = $("#bk-settings-tb-thread-watcher-expiry-time");
	let threadwatcherExpiryTimeUnitSelect = $("#bk-settings-tb-thread-watcher-expiry-time-unit");

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

	if(isNaN(threadwatcherExpiryTimeInput.val()))
		console.log('ERROR: threadwatcherExpiryTime NaN');
	else
		settings.threadwatcherThreadExpiryTime = convertTimeFromUnit(threadwatcherExpiryTimeInput.val(), threadwatcherExpiryTimeUnitSelect.val());

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

loadSettings();
loadNotifications();
loadThreadwatcher();

$(document).on('click', '.bk-delete-notification-btn', async function(e){
  e.preventDefault();
	let notification = $(e.target).closest('.bk-notification');
	deleteNotification(notification);
});


async function deleteNotification(notification){
  let notificationData = JSON.parse(decodeURIComponent(notification.attr('data-notificationdata')));
  let boljiklixNotifications = await GM_getValue("boljiklix-notifications");
	let oldCommentsList = await GM_getValue("boljiklix-myOldComments");
	if(!oldCommentsList)
		return console.log('ERROR');
	if(notificationData.type == 'rateup'){
		oldCommentsList[notificationData.commentId].rateup += notificationData.valueChange;
    delete boljiklixNotifications.rateUps[notificationData.commentId];
  }
	else if(notificationData.type == 'ratedown'){
		oldCommentsList[notificationData.commentId].ratedown += notificationData.valueChange;
    delete boljiklixNotifications.rateDowns[notificationData.commentId];
  }
	else if(notificationData.type == 'response'){
		oldCommentsList[notificationData.commentId].brojOdgovora += notificationData.valueChange;
    
    let toDeleteId = boljiklixNotifications.responses.findIndex(response => response.id == notificationData.id);
    boljiklixNotifications.responses.splice(toDeleteId, 1);
  }else if(notificationData.type == 'admindeleted'){
    delete oldCommentsList[notificationData.commentId];
    delete boljiklixNotifications.adminDeleted[notificationData.commentId];
  }
	notification.remove();
	await GM_setValue("boljiklix-myOldComments", oldCommentsList);
  await GM_setValue("boljiklix-notifications", boljiklixNotifications);
}

async function autoRefreshTimerTick(){
	if(!boljiklixSettings)
		await loadSettings();
	let lastRefreshSpan = $(".bk-refresh-status-last-refresh");
	let nextRefreshCounterSpan = $(".bk-refresh-status-next-refresh-counter");
	let currTime = new Date();
	let timeSinceLastRefresh = currTime.getTime() - new Date(bkLastRefresh).getTime();
	let timeUntilNextRefresh = convertTimeToUnit(boljiklixSettings.autoRefreshInterval - timeSinceLastRefresh);
  timeSinceLastRefresh = convertTimeToUnit(timeSinceLastRefresh);
	let shortVersion = {
		'seconds': 'sek',
		'minutes': 'min',
		'hours': 'sat',
		'days': 'dan'
	};
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



//  ############################### KOMENTARI #################################
$("head").append(`
<style>

.tipkomentar {
  position: relative;
}

.komentarTxt .bk-comment-tag {
  color: blue;
}

.tipkomentar > span.minmax-btn {
  position: absolute;
  top: 10px;
  right: 30px;
}

.tipkomentar > span.watch-thread-btn {
  position: absolute;
  top: 30px;
  right: 30px;
}

.tipodgovor {
    padding-left: 15px;
    border-left: 3px solid #e6e6e6;
    border-left-width: 3px;
    border-left-style: solid;
    border-left-color: rgb(230, 230, 230);
}

.tipodgovor:hover {
    border-left-color: blue !important;
}

</style>
`);

let tagRegex = new RegExp("@[a-zA-Z1-9_.]+", "gim");


$(document).on("click", ".bk-threadwatcher-thread-link", async (e) => {
  e.preventDefault();
  let linkElement = $(e.target);
  if(!linkElement.is('.bk-threadwatcher-thread-link'))
    linkElement = linkElement.closest(".bk-threadwatcher-thread-link");
  let url = linkElement.attr('href');
  let threadId = parseInt(url.split('/komentar/')[1]);
  await updateThreadwatcherThreadStats(threadId);
  window.location.href = url;
});


$(document).on('DOMNodeInserted', '.tipkomentar, .tipodgovor', async function (e) {
  let comment = $(e.target);
  
  if(!comment.is('.tipkomentar') && !comment.is('.tipodgovor'))
    return;
  
  // Highlight @username tags
  let commentText = comment.find('.komentarTxt').html();
  let tags = commentText.match(tagRegex);
  if(tags){
    tags.forEach(tag => {
        commentText = commentText.replace(tag, '<span class="bk-comment-tag">'+tag+'</span>')
    });
    comment.find('.komentarTxt').html(commentText);
  }   
  
  let initialLoadedThreadwatcherData = await GM_getValue("boljiklix-threadwatcher", {});   // SUPER SLOOOOW FIX l8r
  let commentId = comment.find('.komentar').attr('data-id');
  if(initialLoadedThreadwatcherData[commentId])
    updateThreadwatcherThreadStats(commentId);
  
  
  // On click on left border hide thread
  $(e.target).click(function(e1){
    if(e1.offsetX <= parseInt($(e.target).css('borderLeftWidth'))){
      
      if(comment.is('.tipkomentar')){
        hideThread(comment);
      }else{
        hideThread(comment.prevAll(".tipkomentar:first"));
      }
    }
  });
  
  // Parent comment specific 
  if(!comment.is('.tipkomentar'))
    return;
 
  $('<span class="minmax-btn" >[-]</span>').appendTo(comment).click((e)=> hideThread(comment));
  
  // Add thread follow button
  $('<span class="watch-thread-btn" >Zaprati</span>').appendTo(comment).click((e) => followThreadButtonEvent(e, comment));
});


function hideThread(comment){
    let responses = comment.next('.upis').nextUntil('.tipkomentar');
    let hideShowToggle = comment.find('.minmax-btn');
    responses.toggle();
    hideShowToggle.text(hideShowToggle.text() == '[-]' ? '[+]' : '[-]');
}

function followThreadButtonEvent(e, comment){
  let dataId = comment.find(".komentar").attr('data-id');
  if($(e.target).text() == 'Zaprati'){
    followThread(dataId);
    $(e.target).text('Prestani pratiti') ;
  }else{
    unfollowThread(dataId);
    $(e.target).text('Zaprati');
  }
}

// ############################################## ADBLOCK #######################################
$("#ads_leaderboard").remove();


// ##################################### MISC ###################################################
if (!Object.keys) {
    Object.keys = function (obj) {
        var keys = [],
            k;
        for (k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                keys.push(k);
            }
        }
        return keys;
    };
}






