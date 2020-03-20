// ==UserScript==
// @name        BoljiKlix Komentari - klix.ba
// @namespace   Violentmonkey Scripts
// @match       https://www.klix.ba/*
// @grant       none
// @version     1.0
// @author      -
// @description 3/14/2020, 8:31:47 PM
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// ==/UserScript==

$("head").append(`
<style>

.tipkomentar {
  position: relative;
}

.tipkomentar > span.minmax-btn {
  position: absolute;
  top: 50px;
  right: 30px;
}

</style>
`);

$(document).on('DOMNodeInserted', '.tipkomentar', function (e) {
  let comment = $(e.target);
  if(!comment.is('.tipkomentar'))
    return;
  $('<span class="minmax-btn" >[-]</span>').appendTo(comment).click((e)=>{
    let responses = comment.next('.upis').nextUntil('.tipkomentar');
    responses.toggle();
    $(e.target).text($(e.target).text() == '[-]' ? '[+]' : '[-]');
  });
});
