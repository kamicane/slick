/*
Finder Finder
*/"use strict"

// Notable changes from Slick.Finder 1.0.x

// faster bottom -> up expression matching
// prefers mental sanity over *obsessive compulsive* milliseconds savings
// uses prototypes instead of objects
// tries to use matchesSelector smartly, whenever available
// can populate objects as well as arrays
// lots of stuff is broken or not implemented

var parse = require("./parser")

// utilities

var uniqueIndex = 0

var uniqueID = function(node){
    return node.uniqueNumber || (node.uniqueNumber = "s:" + uniqueIndex++)
}

var uniqueIDXML = function(node){
    var uid = node.getAttribute("uniqueNumber")
    if (!uid){
        uid = "s:" + uniqueIndex++
        node.setAttribute("uniqueNumber", uid)
    }
    return uid
}

var isArray = Array.isArray || function(object){
    return Object.prototype.toString.call(object) === "[object Array]"
}

// tests

var HAS = {

    GET_ELEMENT_BY_ID: function(test, id){
        // checks if the document has getElementById, and it works
        test.innerHTML = '<a id="' + id + '"></a>'
        return !!this.getElementById(id)
    },

    QUERY_SELECTOR: function(test){
        // this supposedly fixes a webkit bug with matchesSelector / querySelector & nth-child
        test.innerHTML = '_<style>:nth-child(2){}</style>'

        // checks if the document has querySelectorAll, and it works
        test.innerHTML = '<a class="MiX"></a>'

        return test.querySelectorAll('.MiX').length === 1
    },

    EXPANDOS: function(test, id){
        // checks if the document has elements that support expandos
        test._EXPANDO = id
        var res = test._EXPANDO === id
        delete test._EXPANDO
        return res
    },

    // TODO: use this ?

    // CHECKED_QUERY_SELECTOR: function(test){
    //
    //     // checks if the document supports the checked query selector
    //     test.innerHTML = '<select><option selected="selected">a</option></select>'
    //     return test.querySelectorAll(':checked').length === 1
    // },

    // TODO: use this ?

    // EMPTY_ATTRIBUTE_QUERY_SELECTOR: function(test){
    //
    //     // checks if the document supports the empty attribute query selector
    //     test.innerHTML = '<a class=""></a>'
    //     return test.querySelectorAll('[class*=""]').length === 1
    // },

    MATCHES_SELECTOR: function(test){

        test.innerHTML = '<a class="MiX"></a>'

        // checks if the document has matchesSelector, and we can use it.

        var matches = test.matchesSelector || test.mozMatchesSelector || test.webkitMatchesSelector

        // if matchesSelector trows errors on incorrect syntax we can use it
        if (matches) try {
            matches.call(test, ':slick')
        } catch(e){
            // just as a safety precaution, also test if it works on mixedcase (like querySelectorAll)
            return matches.call(test, ".MiX") ? matches : false
        }

        return false
    },

    GET_ELEMENTS_BY_CLASS_NAME: function(test){
        test.innerHTML = '<a class="f"></a><a class="b"></a>'
        if (test.getElementsByClassName('b').length !== 1) return false

        test.firstChild.className = 'b'
        if (test.getElementsByClassName('b').length !== 2) return false

        // Opera 9.6 getElementsByClassName doesnt detects the class if its not the first one
        test.innerHTML = '<a class="a"></a><a class="f b a"></a>'
        if (test.getElementsByClassName('a').length !== 2) return false

        // tests passed
        return true
    },

    // no need to know

    // GET_ELEMENT_BY_ID_NOT_NAME: function(test, id){
    //     test.innerHTML = '<a name="'+ id +'"></a><b id="'+ id +'"></b>'
    //     return this.getElementById(id) !== test.firstChild
    // },

    // this is always checked for and fixed

    // STAR_GET_ELEMENTS_BY_TAG_NAME: function(test){
    //
    //     // IE returns comment nodes for getElementsByTagName('*') for some documents
    //     test.appendChild(this.createComment(''))
    //     if (test.getElementsByTagName('*').length > 0) return false
    //
    //     // IE returns closed nodes (EG:"</foo>") for getElementsByTagName('*') for some documents
    //     test.innerHTML = 'foo</foo>'
    //     if (test.getElementsByTagName('*').length) return false
    //
    //     // tests passed
    //     return true
    // },

    // this is always checked for and fixed

    STAR_QUERY_SELECTOR: function(test){

        // returns closed nodes (EG:"</foo>") for querySelector('*') for some documents
        test.innerHTML = 'foo</foo>'
        return !!(test.querySelectorAll('*').length)
    },

    FORM_ATTRIBUTE_GETTER: function(test){
        test.innerHTML = '<form action="s"><input id="action"/></form>'
        return test.firstChild.getAttribute('action') === 's'
    }

}

// Finder

var Finder = function Finder(document){

    this.document        = document
    var root = this.root = document.documentElement
    this.tested          = {}

    // uniqueID

    this.uniqueID = this.has("EXPANDOS") ? uniqueID : uniqueIDXML

    // getAttribute

    this.getAttribute = (this.has("FORM_ATTRIBUTE_GETTER")) ? function(node, name){

        return node.getAttribute(name)

    } : function(node, name){

        var attributeNode = node.getAttributeNode(name)
        return (attributeNode) ? attributeNode.nodeValue : null

    }

    // hasAttribute

    this.hasAttribute = (root.hasAttribute) ? function(node, attribute){

        return node.hasAttribute(attribute)

    } : function(node, attribute) {

        node = node.getAttributeNode(attribute)
        return !!(node && (node.specified || node.nodeValue))

    }

    // contains

    this.contains = (document.contains && root.contains) ? function(context, node){

        return context.contains(node)

    } : (root.compareDocumentPosition) ? function(context, node){

        return context === node || !!(context.compareDocumentPosition(node) & 16)

    } : function(context, node){

        do {
            if (node === context) return true
        } while ((node = node.parentNode))

        return false
    }

    // sort
    // credits to Sizzle (http://sizzlejs.com/)

    this.sorter = (root.compareDocumentPosition) ? function(a, b){

        if (!a.compareDocumentPosition || !b.compareDocumentPosition) return 0
        return a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1

    } : ('sourceIndex' in root) ? function(a, b){

        if (!a.sourceIndex || !b.sourceIndex) return 0
        return a.sourceIndex - b.sourceIndex

    } : (document.createRange) ? function(a, b){

        if (!a.ownerDocument || !b.ownerDocument) return 0
        var aRange = a.ownerDocument.createRange(),
            bRange = b.ownerDocument.createRange()

        aRange.setStart(a, 0)
        aRange.setEnd(a, 0)
        bRange.setStart(b, 0)
        bRange.setEnd(b, 0)
        return aRange.compareBoundaryPoints(Range.START_TO_END, bRange)

    } : null

    this.failed = {}

    var nativeMatches = this.has("MATCHES_SELECTOR")

    if (nativeMatches) this.matchesSelector = function(node, expression){

        if (this.failed[expression]) return true

        try {
            return nativeMatches.call(node, expression)
        } catch(e){
            return this.failed[expression] = true
        }

    }

    if (this.has("QUERY_SELECTOR")){

        var star = this.has("STAR_QUERY_SELECTOR")

        this.querySelector = function(node, expression, one){

            if (this.failed[expression]) return true

            try {
                if (star && one){
                    var res = node.querySelector(expression)
                    return res ? null : [res]
                } else {
                    return node.querySelectorAll(expression)
                }
            } catch(e){
                return this.failed[expression] = true
            }

        }

    }

}

Finder.prototype.has = function(FEATURE){

    var tested        = this.tested,
        testedFEATURE = tested[FEATURE]

    if (testedFEATURE != null) return testedFEATURE

    var root     = this.root,
        document = this.document,
        testNode = document.createElement("div")

    testNode.setAttribute("style", "display: none;")

    root.appendChild(testNode)

    var TEST = HAS[FEATURE], result = false

    if (TEST) try {
        result = TEST.call(document, testNode, "s:" + (uniqueIndex++))
    } catch(e){}

    root.removeChild(testNode)

    return tested[FEATURE] = result

}

Finder.prototype.search = function(context, expression, found, one){

    if (!context) context = this.document

    var expressions = parse(expression)

    if (!found) found = []

    if (!expressions.length) return found

    var push = (isArray(found)) ? function(node){
        found[found.length] = node
    } : function(node){
        found[found.length++] = node
    }

    // simpleSelector

    // TODO: simple selectors for speed, div?#id, div?.className, div

    // querySelector

    // TODO: more functional tests

    if (!slick.noQS && this.querySelector){

        var nodes = this.querySelector(context, expressions.toString(), one)
        if (nodes !== true){
            if (nodes && nodes.length) for (var i = 0, node; node = nodes[i++];){
                if (node.nodeName > '@'){
                    if (one) return node
                    push(node)
                }
            }
            return one ? null : found
        }
    }

    if (slick.debug) console.warn("querySelectorAll failed on " + expressions.toString())

    var uniques
    if (expressions.length > 1){
        uniques = {}
        var _push = push
        push = function(node){
            var uid = uniqueID(node)
            if (!uniques[uid]){
                uniques[uid] = true
                _push(node)
            }
        }
    }

    // walker

    for (var i = 0, expression; expression = expressions[i++];){

        var expressionLength = expression.length,
            lastExpression   = expression[expressionLength - 1]

        var nodes = this.last(context, lastExpression, uniques)

        if (!nodes.length) continue

        var expressionIndex = expressionLength - 2,
            nextExpression  = expression[expressionIndex]

        for (var n = 0, node; node = nodes[n++];){
            var validates
            if (!nextExpression) validates = this.validateLast(context, node, lastExpression.combinator)
            else validates = this.validate(context, node, expressionIndex, expression)
            if (validates){
                // if one && expressions.length isnt > 1 there is no sorting, so we can exit immediately
                if (one && !uniques) return node
                push(node)
            }
        }

    }

    if (uniques && found.length) found = this.sort(found)

    // one needs to return the first in the document, so we need to gather all and sort and all.

    return one ? found[0] : found

}

Finder.prototype.sort = function(nodes){
    return this.sorter ? Array.prototype.sort.call(nodes, this.sorter) : nodes
}

var combinators = {

    " ": function(node, check){
        while ((node = node.parentNode) && node !== this.document){
            if (check(node)) return true
        }
    },

    // direct children of
    ">": function(node, check){
        node = node.parentNode
        if (node !== this.document && check(node)) return true
    },

    // next siblings of
    "~": function(node, check){
        while ((node = node.previousSibling)){
            if (node.nodeType === 1 && check(node)) return true
        }
    },

    // next sibling of
    "+": function(node, check){
        while ((node = node.previousSibling)){
            if (node.nodeType === 1) return check(node)
        }
    }

}

Finder.prototype.validate = function(context, node, expressionIndex, expression){

    var bit            = expression[expressionIndex],
        combinator     = expression[expressionIndex + 1].combinator,
        nextExpression = expression[--expressionIndex]

    var self = this

    return !!combinators[combinator](node, function(node){
        if (!self.match(node, bit)) return false
        if (!nextExpression) return self.validateLast(context, node, bit.combinator)
        return self.validate(context, node, expressionIndex, expression)
    })

}

Finder.prototype.validateLast = function(context, node, combinator){
    return !!combinators[combinator](node, function(node){
        return node === context
    })
}

var pseudos = {

    'empty': function(){
        var child = this.firstChild
        return !(this && this.nodeType == 1) && !(this.innerText || this.textContent || '').length
    },

    'not': function(expression){
        return !slick.match(this, expression)
    },

    'contains': function(text){
        return (this.innerText || this.textContent || '').indexOf(text) > -1
    },

    'first-child': function(){
        var node = this
        while ((node = node.previousSibling)) if (node.nodeType == 1) return false
        return true
    },

    'last-child': function(){
        var node = this
        while ((node = node.nextSibling)) if (node.nodeType == 1) return false
        return true
    },

    'only-child': function(){
        var prev = this
        while ((prev = prev.previousSibling)) if (prev.nodeType == 1) return false

        var next = this
        while ((next = next.nextSibling)) if (next.nodeType == 1) return false

        return true
    },

    'first-of-type': function(){
        var node = this, nodeName = node.nodeName
        while ((node = node.previousSibling)) if (node.nodeName == nodeName) return false
        return true
    },

    'last-of-type': function(){
        var node = this, nodeName = node.nodeName
        while ((node = node.nextSibling)) if (node.nodeName == nodeName) return false
        return true
    },

    'only-of-type': function(){
        var prev = this, nodeName = this.nodeName
        while ((prev = prev.previousSibling)) if (prev.nodeName == nodeName) return false
        var next = this
        while ((next = next.nextSibling)) if (next.nodeName == nodeName) return false
        return true
    },

    'enabled': function(){
        return !this.disabled
    },

    'disabled': function(){
        return this.disabled
    },

    'checked': function(){
        return this.checked || this.selected
    },

    'selected': function(){
        return this.selected
    },

    'focus': function(){
        var doc = this.ownerDocument
        return doc.activeElement === this && (this.href || this.type || slick.hasAttribute(this, 'tabindex'))
    },

    'root': function(){
        return (this === this.ownerDocument.documentElement)
    }

}

Finder.prototype.match = function(node, bit, noTag, noId, noClass){

    // TODO: more functional tests ?

    if (!slick.noQS && this.matchesSelector){
        var matches = this.matchesSelector(node, bit.toString())
        if (matches !== true) return matches
    }

    if (slick.debug) console.warn("matchesSelector failed on " + bit.toString())

    // normal matching

    if (!noTag && bit.tag){

        var nodeName = node.nodeName.toLowerCase()
        if (bit.tag === "*"){
            if (nodeName < "@") return false
        } else if (nodeName != bit.tag){
            return false
        }

    }

    if (!noId && bit.id && this.getAttribute(node, 'id') !== bit.id) return false

    var i, part

    if (!noClass && bit.classes){

        var className = this.getAttribute(node, "class")
        if (!className) return false

        for (var part in bit.classes) if (!RegExp('(^|\\s)' + bit.classes[part] + '(\\s|$)').test(className)) return false
    }

    if (bit.attributes) for (i = 0; part = bit.attributes[i++];){

        var operator  = part.operator,
            name      = part.name,
            value     = part.value,
            escaped   = part.escapedValue

        if (!operator){

            if (!this.hasAttribute(node, name)) return false

        } else {

            var actual = this.getAttribute(node, name)
            if (actual == null) return false

            switch (operator){
                case '^=' : if (!RegExp(      '^' + escaped            ).test(actual)) return false; break
                case '$=' : if (!RegExp(            escaped + '$'      ).test(actual)) return false; break
                case '~=' : if (!RegExp('(^|\\s)' + escaped + '(\\s|$)').test(actual)) return false; break
                case '|=' : if (!RegExp(      '^' + escaped + '(-|$)'  ).test(actual)) return false; break

                case '='  : if (actual !== value) return false; break
                case '*=' : if (actual.indexOf(value) === -1) return false; break
                default   : return false
            }

        }
    }

    if (bit.pseudos) for (i = 0; part = bit.pseudos[i++];){

        var name  = part.name,
            value = part.value

        if (pseudos[name]) return pseudos[name].call(node, value)

        if (value != null){
            if (this.getAttribute(node, name) !== value) return false
        } else {
            if (!this.hasAttribute(node, name)) return false
        }

    }

    return true

}

Finder.prototype.matches = function(node, expression){

    var expressions = parse(expression)

    if (expressions.length === 1 && expressions[0].length === 1){ // simplest match
        return this.match(node, expressions[0][0])
    }

    // TODO: more functional tests ?

    if (!slick.noQS && this.matchesSelector){
        var matches = this.matchesSelector(node, expressions.toString())
        if (matches !== true) return matches
    }

    if (slick.debug) console.warn("matchesSelector failed on " + expressions.toString())

    var nodes = this.search(node, expression, {length: 0})

    for (var i = 0, res; res = nodes[i++];) if (node === res) return true
    return false

}

Finder.prototype.last = function(node, bit, uniques){

    var item, items, found = {length: 0}

    var noId = !bit.id, noTag = !bit.tag, noClass = !bit.classes

    if (bit.id && node.getElementById && this.has("GET_ELEMENT_BY_ID")){
        item = node.getElementById(bit.id)

        // return only if id is found, else keep checking
        // might be a tad slower on non-existing ids, but less insane

        if (item && this.getAttribute(node, 'id') === bit.id){
            items = [item]
            noId = true
            // if tag is star, no need to check it in match()
            if (bit.tag === "*") noTag = true
        }
    }

    if (!items){

        if (bit.classes && node.getElementsByClassName && this.has("GET_ELEMENTS_BY_CLASS_NAME")){
            items = node.getElementsByClassName(bit.classList)
            if (!items || !items.length) return found
            noClass = true
            // if tag is star, no need to check it in match()
            if (bit.tag === "*") noTag = true
        } else {
            items = node.getElementsByTagName(bit.tag)
            if (!items || !items.length) return found

            // if tag is star, need to check it in match because it could select junk
            if (bit.tag !== "*") noTag = true
        }

    }

    if (!uniques && noTag && noId && noClass && !bit.attributes && !bit.pseudos) return items

    for (var i = 0; item = items[i++];) if (
        (!uniques || !uniques[this.uniqueID(item)]) && (
            (noTag && noId && noClass && !bit.attributes && !bit.pseudos) ||
            this.match(item, bit, noTag, noId, noClass)
        )
    ) found[found.length++] = item

    return found

}

var finders = {}

var finder = function(node){
    var doc = node || document
    if (doc.nodeType !== 9) doc = doc.ownerDocument
    if (!doc || doc.nodeType !== 9) throw new TypeError("invalid document")

    var uid = uniqueID(doc)
    return finders[uid] || (finders[uid] = new Finder(doc))
}

// ... API ...

var slick = function(expression, context){
    return finder(context).search(context, expression)
}

slick.search = function(expression, context, array){
    return finder(context).search(context, expression, array)
}

slick.find = function(expression, context){
    return finder(context).search(context, expression, {length: 0}, true)
}

slick.getAttribute = function(node, name){
    return finder(node).getAttribute(node, name)
}

slick.hasAttribute = function(node, name){
    return finder(node).hasAttribute(node, name)
}

slick.contains = function(context, node){
    return finder(context).contains(context, node)
}

slick.match = function(node, expression){
    return finder(node).matches(node, expression)
}

slick.sort = function(nodes){
    if (!nodes || !nodes.length) return nodes
    new Finder(doc(nodes[0])).sort(nodes)
}

slick.parse = parse

slick.debug = true
slick.noQS  = true

module.exports = slick
