// ==UserScript==
// @name        BlackBoard menu
// @namespace   http://users-cs.au.dk/rav/
// @description Display direct link to all users in groups
// @include     https://bb.au.dk/*
// @version     1
// @grant       none
// ==/UserScript==

var LANG = document.documentElement.lang;
if (LANG == 'en-GB') {
	var TR = {
		'title': 'Find people in groups',
		'': ''
	};
} else {
	var TR = {
		'title': 'Søg brugere i grupper',
		'': ''
	};
}

var li1 = document.querySelector(
	"[id='controlpanel.users.and.groups']");
if (li1) {
	var ul = li1.parentNode;
	console.log(ul);
	var h4 = document.createElement('h4');
	var li = document.createElement('li');
	var a = document.createElement('a');
	a.style.background = 'none';

	var courseId = /course_id=[^&;]+/.exec(location.search)[0];
	a.href = ('/webapps/bb-group-mgmt-LEARN/execute/groupInventoryList?'
			+ courseId + '&chkAllRoles=all&showAll=true&toggleType=users'
			+ '&liveFilterOnly=jatak');
	a.target = 'content';
	a.textContent = TR['title'];
	h4.appendChild(a);
	li.appendChild(h4);
	ul.insertBefore(li, li1.nextSibling);
}

window.top.document.title = document.title;

// vim: set ts=2 sw=2 sts=2 noet:
