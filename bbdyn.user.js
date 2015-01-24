// ==UserScript==
// @name        BlackBoard improvements
// @namespace   http://users-cs.au.dk/rav/
// @description Adds live filtering and search form redisplay
// @include     https://bb.au.dk/*
// @version     0.1
// @grant       none
// @updateURL   https://github.com/Mortal/bbdyn/raw/stable/bbdyn.user.js
// ==/UserScript==

'use strict';

var LANG = document.documentElement.lang;
if (LANG === 'en-GB') {
    var TR = {
        'showAll': 'All on 1 page',
        'liveQuery': 'Filter:',
        'title': 'Find people in groups',
        '': ''
    };
} else {
    var TR = {
        'showAll': 'Alle på 1 side',
        'liveQuery': 'Filter:',
        'title': 'Søg brugere i grupper',
        '': ''
    };
}

function getText(o) {
    // Given a Node, return its text content.
    return o.textContent.trim();
}

function rowToUser(row) {
    // Given a <TR>, return a User object.

    var cells = [].slice.call(row.cells).map(getText),
        username = cells[1],
        first = cells[2],
        last = cells[3],
        role = cells[4],
        search_string,

        groupItemSelector = '.userGroupNamesListItem',
        groupElements = row.cells[5].querySelectorAll(groupItemSelector),
        groups = [].slice.call(groupElements).map(getText);
    groups.pop(); // "Add Group"

    search_string = (username + ' ' + first + ' ' + last + ' '
            + groups.join(' '));

    return {
        username: username,
        first: first,
        last: last,
        role: role,
        groups: groups,
        search: search_string.toLowerCase()
    };
}

function add_json_as_textarea(node, data) {
    var textarea = document.createElement('textarea');
    textarea.style.display = 'none';
    textarea.value = JSON.stringify(data);
    node.appendChild(textarea);
    return textarea;
}

function match_word(user, word) {
    var n = parseInt(word);
    if (n === n) {
        // Is an int
        var re = new RegExp('\\b' + word + '\\b');
        return !!re.exec(user.search);
    } else {
        return user.search.indexOf(word) !== -1;
    }
}

function make_search_form(textarea, rows, users) {
    var form, query;
    form = document.createElement('form');
    form.innerHTML = (
        '<label for="live_query"><b>' +
        TR.liveQuery + '</b></label> '
    );
    form.style.margin = '0 14px';
    query = document.createElement('input');
    query.id = 'live_query';
    function update() {
        var q = query.value.trim().toLowerCase().replace(/ +/g, ' '),
            words = q.split(' '),
            selected = [],
            i,
            j,
            match;
        for (i = 0; i < rows.length; i += 1) {
            match = true;
            for (j = 0; j < words.length; j += 1) {
                if (!match_word(users[i], words[j])) {
                    match = false;
                }
            }
            rows[i].style.display = match ? '' : 'none';
            if (match) {
                selected.push(users[i]);
            }
        }
        textarea.value = JSON.stringify(selected);
    }
    query.addEventListener('change', update, false);
    query.addEventListener('input', update, false);
    form.appendChild(query);
    return form;
}

function redisplay_form(bbSearchForm) {
    var elements = [].slice.call(bbSearchForm.elements),
        i,
        j,
        el,
        type,
        o,
        value,
        opts;

    // Only fields with names are part of the search
    elements = elements.filter(function (el) {
        return !!el.name;
    });

    bbSearchForm.match.selectedIndex = 0;
    for (i = 0; i < elements.length; i += 1) {
        // The search form has three kinds of fields: select, text and checkbox.
        el = elements[i];

        // The type of a field is either its <input> type or its tag name.
        type = (el.tagName === 'INPUT') ? el.type : el.tagName;

        // Search the query string for the field value
        o = new RegExp(el.name + '=([^&;]*)', 'i').exec(location.search);

        // Unchecked checkboxes are not part of the HTTP submission
        value = o ? o[1] : null;

        if (type === 'checkbox') {
            el.checked = !!value;

        } else if (type === 'SELECT') {
            opts = [].slice.call(el.options);
            for (j = 0; j < opts.length; j += 1) {
                if (opts[j].value === value) {
                    el.selectedIndex = j;
                    break;
                }
            }

        } else {
            // Probably a text field.
            el.value = value || '';
        }
    }
}

function add_show_all(bbSearchForm) {
    // Add a form field to show all since this is not normally part of the form.
    // bbSearchForm is <form id=bbSearchForm>

    // All form fields are contained in a single <li>
    var container = bbSearchForm.querySelector('li'),
        chk,
        label;

    // Add checkbox
    chk = document.createElement('input');
    chk.name = 'showAll';
    chk.type = 'checkbox';
    chk.value = 'true';
    chk.id = 'id_showAll';
    container.appendChild(chk);

    // Add label
    label = document.createElement('label');
    label.setAttribute('for', chk.id);
    label.textContent = TR.showAll;
    container.appendChild(label);
}

function extract_groups(users) {
    var groups = [], i, j, gr;
    for (i = 0; i < users.length; i += 1) {
        for (j = 0; j < users[i].groups.length; j += 1) {
            gr = users[i].groups[j];
            if (groups.indexOf(gr) === -1) {
                groups.push(gr);
            }
        }
    }
    groups.sort();
    return groups;
}

function parseUserGroupList() {
    var targetPage = '/webapps/bb-group-mgmt-LEARN/execute/groupInventoryList';
    if (location.pathname !== targetPage) {
        return;
    }
    if (location.search.indexOf('toggleType=users') === -1) {
        return;
    }

    var userGroupList = document.getElementById('userGroupList');
    if (!userGroupList) {
        console.log("Could not find #userGroupList");
        return;
    }

    var tbody = document.getElementById('userGroupList_databody');
    var rows = [].slice.call(tbody.rows);
    var users = rows.map(rowToUser);
    var textarea = add_json_as_textarea(userGroupList, users);

    console.log(extract_groups(users));

    var bbSearchForm = document.getElementsByName('searchForm')[0];
    add_show_all(bbSearchForm);
    redisplay_form(bbSearchForm);

    var ourSearchForm = make_search_form(textarea, rows, users);
    bbSearchForm.parentNode.insertBefore(ourSearchForm, bbSearchForm);
    if (location.search.indexOf('liveFilterOnly') !== -1) {
        var header = document.getElementById('pageTitleText');
        header.textContent = TR.title;
        window.top.document.title = document.title = header.textContent;
        bbSearchForm.parentNode.removeChild(bbSearchForm);
    }
}

function amendMenu() {
    var existingMenuItem = document.querySelector(
        "[id='controlpanel.users.and.groups']"
    );
    if (existingMenuItem) {
        var ul = existingMenuItem.parentNode;
        console.log(ul);
        var h4 = document.createElement('h4');
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.style.background = 'none';

        var courseId = /course_id=[_0-9]+/.exec(location.search)[0];
        a.href = ('/webapps/bb-group-mgmt-LEARN/execute/groupInventoryList?'
                + courseId + '&chkAllRoles=all&showAll=true&toggleType=users'
                + '&liveFilterOnly=jatak');
        a.target = 'content';
        a.textContent = TR.title;
        h4.appendChild(a);
        li.appendChild(h4);
        ul.insertBefore(li, existingMenuItem.nextSibling);
    }
}

parseUserGroupList();

amendMenu();

window.top.document.title = document.title;

// vim: set ts=4 sw=4 sts=4 et:
