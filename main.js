// ==UserScript==
// @name        BoljiKlix - klix.ba
// @namespace   Violentmonkey Scripts
// @match       https://www.klix.ba/*
// @grant       none
// @version     1.0
// @author      -
// @description 3/14/2020, 8:31:47 PM
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// ==/UserScript==

window.comments = {};
let users = {};

function User(id, avatar, banovan, username, spol){
  this.id = id;
  this.avatar = avatar;
  this.banovan = banovan;
  this.username = username;
  this.spol = spol;
}
function createOrFindUser(id, avatar, banovan, username, spol, path) {
  if(!users[path])
    users[path] = new User( id,
                             avatar,
                             banovan,
                             username,
                             spol );
  return path;
};

let tagRegex = new RegExp("@[a-zA-Z1-9]+", "gim");

function findUniqueUserWithSimilarUsername(username, komentar){
  let similarUsernames = [];
  for(path in users){
    if(path.includes(username))
      similarUsernames.push(path);
  }
  if(similarUsernames.length == 1)
    return similarUsernames[0];
  if(similarUsernames.length == 0)
    return username;
  similarUsernames.forEach(su => {
    if(komentar.includes(su))
      return su;
    if(komentar.includes(users[su].username))
      return su;
  });
}

function Comment(params, originalParentId){
  this.user = createOrFindUser( params.id,
                                      params.avatar,
                                      params.banovan,
                                      params.username,
                                      params.spol,
                                      params.path );
  this.id = params.id;
  this.komentar = params.komentar;
  this.datum = new Date(params.datum);
  this.rateup = params.rateup;
  this.ratedown = params.ratedown;
  this.ocjena = params.ocjena;
  this.topKomentar = params.topKomentar || false;
  this.originalParentId = originalParentId;
  this.responses = [];
  this.addResponse = (id) => this.responses.push(id);
  
  let searchForTags = function(){
    let usernames = this.komentar.match(tagRegex);
    if(!usernames)
      return;
    usernames.forEach(username => {
      username = username.substr(1).toLowerCase();
      username = findUniqueUserWithSimilarUsername(username);
      let responseTo = getLatestCommentByUserInOriginalThread(username, this.originalParentId, this.datum);
      if(responseTo){
        window.comments[responseTo].addResponse(this.id);
        this.isTaggedReply = true;
      }else{
        console.log(username, this.id);
      }
    });
  }
  
  searchForTags = searchForTags.bind(this);
  searchForTags();
  
  function getLatestCommentByUserInOriginalThread(username, originalParentId, responseDate){
    let latestDate;
    let latestId;
    for( id in window.comments){
      let comment = window.comments[id];
     // console.log(comment.user, comment.originalParentId, comment.datum);
      if( comment.user == username &&
          (!latestDate || comment.datum > latestDate) && 
          comment.datum < responseDate ){
        latestDate = comment.datum;
        latestId = id;
      }
  }
    return latestId;
  }
  
  
}

let newCommentSectionTP = `
  <div class="newCommentSection">
    <div class="commentList"></div>
    <button onclick="loadNextPage()">
  </div>
`;

let newCSS = `
  .newCommentSection{
    background-color: pink;
    height: 100px;
    width: 100%;
  }
  .commentList{

  }
`;

let nextURL;

function setupNewUI(){
  // remove old UI 
  window.$container.infiniteScroll('destroy');
  $('.komentariCont').empty();
  
  // setup new UI
  window.newCommentSection = $(newCommentSectionTP).appendTo('.komentariCont');
  window.commentList = $('.commentList');
  $("head").append(newCSS);  
  
}


window.loadNextPage = function (){
  requestNextPage((err, response) => {
    if(err)
      return console.error(err);
    let commentsToRender = handleNewCommentPageResponse(response);
    renderNewComments(commentsToRender);
  });
}

function renderNewComments(commentsToRender){
    commentsToRender.forEach(commentId => {
      renderComment(commentId);
    });
}

function renderComment(commentId){
  $('.commentList').append(generateNewCommentElement(commentId));
}

function generateNewCommentElement(commentId){
  let comment = window.comments[commentId];
  return `
  <div class="comment">
    <div class="userInfo">
      <span>${users[comment.user].username}</span>
    </div>
    <div class="commentText">
      <span>${comment.komentar}</span>
    </div>
    <div class="commentFooter">
    <span>Score:${comment.ocjena} Upvotes:${comment.rateup} Downvotes:${comment.ratedown}</span>
    </div>
  </div>
  `;
}

function requestNextPage(cb){
  let articleId = parseInt(window.location.href.split('/').slice(-1)[0]);
  let requestURL = nextURL || "https://api.klix.ba/v1/komentari/" + articleId;
  const request = new XMLHttpRequest();
  request.open('GET', requestURL);
  request.onload = () => cb(null, request.response);
  request.onerror = () => cb(request.response);
  request.send();
}

function handleNewCommentPageResponse(response){
    let data = JSON.parse(response);
    if(!data.komentari)
        return;
    nextURL = data.nextURL;
    let newCommentList = [];
    data.komentari.forEach(comment => {
      window.comments[comment.id] = new Comment(comment);
      let commentIndex = comment.id;
      newCommentList.push(commentIndex);
      comment.odgovori.forEach(commentResponse => {
        window.comments[commentResponse.id] = new Comment(commentResponse, commentIndex);
        if(!window.comments[commentResponse.id].isTaggedReply)
            window.comments[comment.id].addResponse(commentResponse.id);
      });
    });
    return newCommentList;
}

function infiniteScrollHandler(event, response){
  handleNewCommentPageResponse(response);
  let commentsToRender = handleNewCommentPageResponse(response);
  renderNewComments(commentsToRender);
}

$( document ).ready(function() {
  let firstLoad = true;
  window.$container.on('load.infiniteScroll', function(event, response) {
    setupNewUI();
    infiniteScrollHandler(event, response);
    if(firstLoad){
      firstLoad = false;
    }
  });
});
