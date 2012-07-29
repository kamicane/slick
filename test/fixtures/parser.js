(function(){

    var fixtures = {
        TAGS: 'normal UPCASE escaped\\,character ǝpoɔıun'.split(' '),
        IDS: "normal escaped\\,character ǝpoɔıun with-dash with_underscore 123number silly\\:id\\:\\:with\\:colons".split(' '),
        CLASSES: "normal escaped\\,character ǝpoɔıun 瀡 with-dash with_underscore 123number MiXeDcAsE".split(' '),
        ATTRIB_OPERATORS: '= != *= ^= $= ~= |='.split(' '),
        ATTRIB_KEYS: [
            'normal',
            'spaced',
            'spaced ',
            'escaped\\]character',
            'ǝpoɔıun',
            'with-dash',
            'with_underscore',
            '123number'
        ],
        ATTRIB_VALUES: [
            'normal',
            'ǝpoɔıun',
            '"double quote"',
            '\'single quote\'',
            '"double\\"escaped"',
            '\'single\\\'escaped\'',
            ' spaced',
            'spaced ',
            ' "spaced"',
            ' \'spaced\'',
            '"spaced" ',
            '\'spaced\' ',
            'parens()',
            'curly{}',
            '"quoted parens()"',
            '"quoted curly{}"',
            '"quoted square[]"'
        ],
        PSEUDO_KEYS: 'normal escaped\\,character ǝpoɔıun with-dash with_underscore'.split(' '),
        PSEUDO_VALUES: 'normal,ǝpoɔıun, spaced,"double quote",\'single quote\',"double\\"escaped",\'single\\\'escaped\',curly{},square[],"quoted parens()","quoted curly{}","quoted square[]"'.split(','),
        COMBINATORS: (" >+~`!@$%^&={}\\;</").split('')
    }

    if (typeof module !== 'undefined') {
        module.exports = fixtures
    } else {
        this.fixtures = this.fixtures || {}
        ;this.fixtures.parser = fixtures
    }

}())
