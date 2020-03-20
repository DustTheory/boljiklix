// ==UserScript==
// @name        BoljiKlix Toolbar - klix.ba
// @namespace   Violentmonkey Scripts
// @match       https://www.klix.ba/*
// @grant GM_getValue
// @grant GM_setValue
// @version     0.1.1.3
// @author      ishakd00
// @description 3/20/2020, 21:31:00 PM
// ==/UserScript==

$("head").append(`
<style>

.main-view {
  padding-top: 90px;
}

.boljiklix-toolbar {
  width: 100%;
  height: 30px;
  
  background-color: white;
}

.bk-tb-refresh-btn:hover{
  color: blue;
  cursor: pointer;
}

.boljiklix-notifikacije {
  position: fixed;
  z-index: 999;
  top: 90px;
  left: 30px;
  
  width: 300px;
  height: 100px;

  background-color: white;
}

</style>
`);

let toolbarTemplate = `
<div class="boljiklix-toolbar">
  <span class='bk-tb-refresh-btn' >Osvjezi</span>
  <span>Zadnji put osvjezeno: 3 min</span>
  <span>Sljedeci put auto: 20s</span>

  <span>Notifikacija: 13</span>
  <span>Postavke</span>
</div>
`;

let notifikacijeTemplate = `
<div class="boljiklix-notifikacije">
</div>
`;

function generateNotification(text){
	return `
		<div class="bk-notifikacija">
			${text}
		</div>
	`
}

async function osvjezi() {
	osvjeziKomentare();
	osvjeziNotifikacije();
}

function osvjeziKomentare() {

}

function getMyUsername() {
	let userNameLink = $(".username-link");
	if (!userNameLink)
		return false;
	return userNameLink.attr('href').split('profil/').slice(-1)[0];
}

async function osvjeziNotifikacije() {
	let newRateUps = {};
	let newRateDowns = {};
	let newResponses = [];
	getMyCommentsList(async (commentsList) => {
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
					brojOdgovora: (comment.brojOdgovora ? comment.brojOdgovora : 0),
					zadnjiOdgovorDatum: newCommentResponses.length ? new Date(newCommentResponses[0].datum) : new Date(0)
				}
			} else {
				if (comment.rateup > oldComment.rateup) {
					newRateUps[comment.id] = comment.rateup - oldComment.rateup;
				//	oldCommentsList[comment.id].rateup = comment.rateup
				}
				if (comment.ratedown > oldComment.ratedown) {
					newRateDowns[comment.id] = comment.ratedown - oldComment.ratedown;
				//	oldCommentsList[comment.id].ratedown = comment.ratedown
				}
				if (comment.brojOdgovora > oldComment.brojOdgovora) {
					let newCommentResponses = await getNewResponses(comment.id, oldComment.zadnjiOdgovorDatum);
					newCommentResponses.forEach(commentResponse => {
						newResponses.push([comment.id, commentResponse]);
					});
					//oldCommentsList[comment.id].brojOdgovora = comment.brojOdgovora;
					//if (newCommentResponses.length)
					//	oldCommentsList[comment.id].zadnjiSpomen = new Date(newCommentResponses[0].datum);
				}
			}
		}));
		await GM_setValue("boljiklix-myOldComments", oldCommentsList);
		pokaziNotifikacije(newRateUps, newRateDowns, newResponses);
	});
};


async function getNewResponses(commentId, lastResponse) {
	let result = await $.ajax({
		url: "https://api.klix.ba/v1/komentar/" + commentId,
	});
	result.odgovori.filter(odg => {
		return new Date(odg.datum) >= lastResponse;
	});
	console.log(result.odgovori);
	return result.odgovori;
}

async function getMyCommentsList(cb) {
	let username = getMyUsername();
	if (!username)
		return;
	let comments = [{
		id: -1
	}];
	getMyNextComments(username, comments, 20, 100, new Date() - 1000 * 60 * 60 * 24 * 7, cb);
}

async function getMyNextComments(username, comments, minComments, maxComments, earliestDate, cb) {
	let lastId = comments[comments.length - 1].id;
	if (isNaN(lastId))
		return cb(comments);

	$.ajax({
		url: `https://api.klix.ba/v1/komentari/${username}${(lastId == -1 ? '' : ('?lastID='+lastId))}`,
		success: function (result) {
			let newComments = result.komentari;
			if (!newComments)
				return cb(comments);
			for (let i = 0; i < newComments.length; i++)
				comments.push(newComments[i]);
			if (comments.length >= maxComments || (comments.length > minComments && new Date(comments[comments.length - 1].datum) <= earliestDate)) {
				return cb(comments);
			} else {
				return getMyNextComments(username, comments, 20, 100, earliestDate, cb);
			}
		}
	});
}

function pokaziNotifikacije(rateUps, rateDowns, responses) {
	notifikacije.empty();
	for(ru in rateUps){
		notifikacije.append(generateNotification(`Vas post ${ru} je dobio ${rateUps[ru]} lajkova`));
	}
	for(rd in rateDowns){
		notifikacije.append(generateNotification(`Vas post ${rd} je dobio ${rateDowns[rd]} dislajkova`));
	}
	responses.forEach(response => {
		notifikacije.append(generateNotification(`${response[1].username} je odgovorio na vas post ${response[0]}: ${response[1].komentar}`));
	});
}

let toolbar = $(toolbarTemplate).appendTo("header");
let notifikacije = $(notifikacijeTemplate).appendTo("body");
$(".bk-tb-refresh-btn").click(osvjezi);