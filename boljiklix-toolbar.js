// ==UserScript==
// @name        BoljiKlix Toolbar - klix.ba
// @namespace   Violentmonkey Scripts
// @match       https://www.klix.ba/*
// @grant GM_getValue
// @grant GM_setValue
// @version     1.0
// @author      -
// @description 3/20/2020, 12:12:31 PM
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
<div class="bk-notifikacija">
@kliksas001 je upranko vas komentar
</div>
<div class="bk-notifikacija">
2 korisnika su uprankali vas komentar
</div>
<div class="bk-notifikacija">
@kliksas002 je odgovorio na vas komentar:
Ne slazem se sa tobom ovdje, a i mama ti je poprilicno ruzn...
</div>
</div>
`;

function osvjezi(){
  osvjeziKomentare();
  osvjeziNotifikacije();
}

function osvjeziKomentare(){
  
}

function getMyUsername(){
  let userNameLink = $(".username-link");
  if(!userNameLink)
    return false;
  return userNameLink.attr('href').split('profil/').slice(-1)[0];
}

async function osvjeziNotifikacije(){
  let newRateUps = {};
  let newRateDowns = {};
  let newResponses = {};
  let newMentions = {};
  getMyCommentsList(async (commentsList)=>{
    let oldCommentsList = await GM_getValue("boljiklix-myOldComments", {});
    await Promise.all(commentsList.map(async (comment) => {
      console.log(comment);
      let oldComment = oldCommentsList[comment.id];
      if(!oldComment){
        let newCommentMentions = await getNewCommentMentions(comment.id, new Date(0));
        let newCommentResponses = [];
        if(comment.tip == 'komentar')
         newCommentResponses = await getNewResponses(comment.id, new Date(0));
        oldCommentsList[comment.id] = {
          id: comment.id,
          rateup: comment.rateup,
          ratedown: comment.ratedown,
          brojOdgovora: (comment.brojOdgovora ? comment.brojOdgovora : 0),
          brojSpomena: newCommentMentions.length,
          zadnjiOdgovorDatum: newCommentResponses.length ? newCommentResponses[0].datum : new Date(0),
          zadnjiSpomenDatum: newCommentMentions.length ? newCommentMentions[0].datum : new Date(0)
        }
      }else{
        if(comment.rateup > oldComment.rateup){
          newRateUps[comment.id] = comment.rateup - oldComment.rateup;
          oldCommentsList[comment.id].rateup = comment.rateup
        }
        if(comment.ratedown > oldComment.ratedown){
          newRateUps[comment.id] = comment.ratedown - oldComment.ratedown;
          oldCommentsList[comment.id].ratedown = comment.ratedown
        }
        if(comment.brojOdgovora > oldComment.brojOdgovora){
          let newCommentResponses = await getNewResponses(comment.id, oldComment.zadnjiOdgovorDatum);
          newCommentResponses.forEach(commentResponse => {
            newResponses.push(commentResponse);
          });
          oldCommentsList[comment.id].brojOdgovora = comment.brojOdgovora;
          if(newCommentResponses.length)
            oldCommentsList[comment.id].zadnjiSpomen = newCommentResponses[0].datum;
        }
        let newCommentMentions = await getNewCommentMentions(comment.id, oldComment.zadnjiSpomenDatum);
        newCommentMentions.forEach(commentMention => {
          newMentions.push(commentMention);
        });
        oldCommentsList[comment.id].brojSpomena += comment.newCommentMentions.length;
        if(newCommentMentions.length)
          oldCommentsList[comment.id].zadnjiSpomen = newCommentMentions[0].datum;
      }
    }));
    await GM_setValue("boljiklix-myOldComments", oldCommentsList);
  });
};

async function getNewCommentMentions(){
  return [];
}

async function getNewResponses(){
  return [];
}

async function getMyCommentsList(cb){
    let username = getMyUsername();
    console.log(username);
    if(!username)
      return;
    let comments = [{id: -1}];
    getMyNextComments(username, comments, 20, 100, new Date()-1000*60*60*24*7, cb);
}

async function getMyNextComments(username, comments, minComments, maxComments, earliestDate, cb){
      let lastId = comments[comments.length - 1].id;
      if(isNaN(lastId))
        return cb(comments);
      
      $.get(`https://api.klix.ba/v1/komentari/${username}${lastId == -1 ? '' : '?lastID='+lastId}`, {}, async function(response, status){
        if(status != 'success')
          return;
        let newComments = response.komentari;
        if(!newComments)
          return cb(comments);
        for(let i = 0; i < newComments.length ; i++)
          comments.push(newComments[i]);
        if(comments.length >= maxComments || (comments.length > minComments && comments[comments.length -1].datum <= earliestDate)){
          return cb(comments);
        }else{
          return getMyNextComments(username, comments, 20, 100, earliestDate, cb);
        }
    });
}

function pokaziNotifikacije(){
  
}

let toolbar = $(toolbarTemplate).appendTo("header");
let notifikacije = $(notifikacijeTemplate).appendTo("body");
$(".bk-tb-refresh-btn").click(osvjezi);