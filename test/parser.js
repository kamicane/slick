
(function(){

var PARSE, s

if (typeof require !== 'undefined') {
    PARSE = require('../lib/parser')
    var expect = require('expect.js')
    var fixtures = {parser: require('./fixtures/parser')}
} else {
    PARSE = slick.parse
}

var TAGS = fixtures.parser.TAGS,
    IDS = fixtures.parser.IDS,
    CLASSES = fixtures.parser.CLASSES,
    ATTRIB_OPERATORS = fixtures.parser.ATTRIB_OPERATORS,
    ATTRIB_KEYS = fixtures.parser.ATTRIB_KEYS,
    ATTRIB_VALUES = fixtures.parser.ATTRIB_VALUES,
    PSEUDO_KEYS = fixtures.parser.PSEUDO_KEYS,
    PSEUDO_VALUES = fixtures.parser.PSEUDO_VALUES,
    COMBINATORS = fixtures.parser.COMBINATORS


describe('Slick Parser', function(){

    it('should exist and be a function', function(){
        expect(PARSE).to.be.a('function')
    })


    describe('comma-separated expressions', function(){
        it('should have length equals to the number of comma-separated expressions', function(){
            s = PARSE('a,b,c')
            expect( s.length ).to.equal( 3 )

            s = PARSE('a')
            expect( s.length ).to.equal( 1 )

            s = PARSE('')
            expect( s.length ).to.equal( 0 )
        })
    })


    describe('TAG',function(){

        it('should always have a tag property', function(){
            s = PARSE('tag')
            expect( s[0][0].tag ).to.equal( 'tag' )

            for (var i=0, TAG; TAG = TAGS[i]; i++){
                s = PARSE(TAG)
                expect( s[0][0].tag ).to.equal( TAG.replace(/\\/g,'') )
            }
        })

        var newTAG = function(TAG){
            return function(){
                s = PARSE(TAG)
                s = s[0][0]
                expect( s.tag ).to.equal( TAG.replace(/\\/g,'') )
            }
        }

        for (var TAG_I=0, TAG; TAG = TAGS[TAG_I]; TAG_I++){
            it('should support TAG: `'+TAG+'`', newTAG(TAG))
        }

    })


    describe('ID', function(){

        it('should always have an id property', function(){
            s = PARSE('#id')
            expect( s[0][0].id ).to.equal( 'id' )

        })

        it('should throw away all but the last id', function(){
            s = PARSE('#id1#id2')
            expect( s[0][0].id ).to.equal( 'id2' )

        })

        var newID = function(ID){
            return function(){
                s = PARSE('#' + ID)
                s = s[0][0]
                expect( s.id ).to.equal( ID.replace(/\\/g,'') )
            }
        }

        for (var ID_I=0, ID; ID = IDS[ID_I]; ID_I++){
            it('should support id: `#'+ID+'`', newID(ID))
        }

    })


    describe('CLASS', function(){

        it('should parse classes into a classList array', function(){
            s = PARSE('.class')
            expect( s[0][0].classList[0] ).to.equal( 'class' )

            s = PARSE('.class1.class2.class3')
            expect( s[0][0].classList ).to.eql( '.class1.class2.class3'.split('.').slice(1) )
        })

        var newCLASS = function(CLASS){
            return function(){

                s = PARSE('.' + CLASS)
                s = s[0][0]
                expect( s.classList[0] ).to.equal( CLASS.replace(/\\/g,'') )

            }
        }

        for (var CLASS_I=0, CLASS; CLASS = CLASSES[CLASS_I]; CLASS_I++){
            it('should support CLASS: `.'+CLASS+'`', newCLASS(CLASS))
        }

        it('should support all CLASSES: `.'+CLASSES.join('.')+'`', function(){
            s = PARSE('.' + CLASSES.join('.'))
            s = s[0][0]

            for (var CLASS_I=0, CLASS; CLASS = CLASSES[CLASS_I]; CLASS_I++){
                expect( s.classList[CLASS_I] ).to.equal( CLASS.replace(/\\/g,'') )
            }
        })

    })


    describe('ATTRIBUTE', function(){

        it('attributes array items should have a name property', function(){
            s = PARSE('[attrib]')
            expect( s[0][0].attributes[0].name ).to.equal( 'attrib' )

            s = PARSE('[attrib1][attrib2][attrib3]')
            expect( s[0][0].attributes[0].name ).to.equal( 'attrib1' )
            expect( s[0][0].attributes[1].name ).to.equal( 'attrib2' )
            expect( s[0][0].attributes[2].name ).to.equal( 'attrib3' )
        })

        it('attributes array items should have a value property', function(){
            s = PARSE('[attrib=attribvalue]')
            expect( s[0][0].attributes[0].value ).to.equal( 'attribvalue' )

            s = PARSE('[attrib1=attribvalue1][attrib2=attribvalue2][attrib3=attribvalue3]')
            expect( s[0][0].attributes[0].value ).to.equal( 'attribvalue1' )
            expect( s[0][0].attributes[1].value ).to.equal( 'attribvalue2' )
            expect( s[0][0].attributes[2].value ).to.equal( 'attribvalue3' )
        })

        it('attributes array items should have a operator property', function(){
            s = PARSE('[attrib=attribvalue]')
            expect( s[0][0].attributes[0].operator ).to.equal( '=' )
        })

        var newATTRIB = function(ATT_actual, ATT_expected){
            ATT_expected = ATT_expected || {}
            if (!ATT_expected[0]) ATT_expected[0] = ATT_actual[0]
            if (!ATT_expected[1]) ATT_expected[1] = ATT_actual[1]
            if (!ATT_expected[2]) ATT_expected[2] = ATT_actual[2]
            ATT_expected[0] = ATT_expected[0].replace(/^\s*|\s*$/g,'').replace(/\\/g,'')
            ATT_expected[2] = ATT_expected[2].replace(/^\s*["']?|["']?\s*$/g,'').replace(/\\/g,'')

            return function(){

                s = PARSE('[' + ATT_actual[0] + ATT_actual[1] + ATT_actual[2] + ']')

                expect( s.length ).to.equal( 1 )
                expect( s[0].length ).to.equal( 1 )

                var e = s[0][0]

                expect( e.attributes[0].name      ).to.equal( ATT_expected[0] )
                expect( e.attributes[0].operator ).to.equal( ATT_expected[1] )
                expect( e.attributes[0].value    ).to.equal( ATT_expected[2] )

            }
        }

        for (var ATTRIB_KEY_I=0, ATTRIB_KEY; ATTRIB_KEY = ATTRIB_KEYS[ATTRIB_KEY_I]; ATTRIB_KEY_I++) {
            describe(ATTRIB_KEY,function(){
                for (var ATTRIB_OPERATOR_I=0, ATTRIB_OPERATOR; ATTRIB_OPERATOR = ATTRIB_OPERATORS[ATTRIB_OPERATOR_I]; ATTRIB_OPERATOR_I++) {

                    for (var ATTRIB_VALUE_I=0, ATTRIB_VALUE; ATTRIB_VALUE = ATTRIB_VALUES[ATTRIB_VALUE_I]; ATTRIB_VALUE_I++) {

                        if (!ATTRIB_VALUE) continue
                        it("should support ATTRIB: `["+ATTRIB_KEY+(    ATTRIB_OPERATOR    )+ATTRIB_VALUE+"]`",
                            newATTRIB([ATTRIB_KEY,    ATTRIB_OPERATOR    ,ATTRIB_VALUE])
                        )

                    }
                }
            })
        }

    })


    describe('PSEUDO', function(){

        it('pseudos array items should have a name property', function(){
            s = PARSE(':pseudo')
            expect( s[0][0].pseudos[0].name ).to.equal( 'pseudo' )

            s = PARSE(':pseudo1:pseudo2:pseudo3')
            expect( s[0][0].pseudos[0].name ).to.equal( 'pseudo1' )
            expect( s[0][0].pseudos[1].name ).to.equal( 'pseudo2' )
            expect( s[0][0].pseudos[2].name ).to.equal( 'pseudo3' )

        })
        it('pseudos array items should have a value property', function(){
            s = PARSE(':pseudo(pseudoValue)')
            expect( s[0][0].pseudos[0].value ).to.equal( 'pseudoValue' )

        })

        // PSEUDO
        var newPSEUDO = function(PSEUDO_KEY, PSEUDO_VALUE){
            return function(){

                s = PARSE(':' + PSEUDO_KEY)
                expect( s.length ).to.equal( 1 )
                expect( s[0].length ).to.equal( 1 )
                s = s[0][0]
                expect( s.pseudos[0].name ).to.equal( PSEUDO_KEY.replace(/\\/g,'') )

                s = PARSE(':' + PSEUDO_KEY +'('+ PSEUDO_VALUE + ')')
                expect( s.length ).to.equal( 1 )
                expect( s[0].length ).to.equal( 1 )
                s = s[0][0]
                expect( s.pseudos[0].name ).to.equal( PSEUDO_KEY.replace(/\\/g,'') )
                expect( s.pseudos[0].value ).to.equal( PSEUDO_VALUE.replace(/^["']/g,'').replace(/["']$/g,'').replace(/\\/g,'') )

            }
        }

        for (var PSEUDO_VALUE_I=0, PSEUDO_VALUE; PSEUDO_VALUE = PSEUDO_VALUES[PSEUDO_VALUE_I]; PSEUDO_VALUE_I++){
            for (var PSEUDO_KEY_I=0, PSEUDO_KEY; PSEUDO_KEY = PSEUDO_KEYS[PSEUDO_KEY_I]; PSEUDO_KEY_I++){
                it('should support PSEUDO: `'+ ':' + PSEUDO_KEY +'('+ PSEUDO_VALUE + ')' +'`', newPSEUDO(PSEUDO_KEY, PSEUDO_VALUE))
            }
        }

    })


    describe('COMBINATOR', function(){

        it('should give each simple selector in each selector expression a combinator', function(){

            s = PARSE('a')
            s = s[0][0]
            expect( s.combinator ).to.equal(' ')

            s = PARSE('a+b')
            expect( s[0][0].combinator ).to.equal(' ')
            expect( s[0][1].combinator ).to.equal('+')

        })

        // COMBINATOR
        var newCOMBINATOR = function(COMBINATOR){
            return function(){

                s = PARSE(COMBINATOR + 'b')
                expect( s[0][0].combinator ).to.equal( COMBINATOR )

                s = PARSE(COMBINATOR + ' b')
                expect( s[0][0].combinator ).to.equal( COMBINATOR )

                s = PARSE('a' + COMBINATOR + 'b')
                expect( s[0][0].combinator ).to.equal( ' ' )
                expect( s[0][1].combinator ).to.equal( COMBINATOR )

            }
        }

        for (var COMBINATOR_I=0, COMBINATOR; COMBINATOR = COMBINATORS[COMBINATOR_I]; COMBINATOR_I++){
            it('should support COMBINATOR: ‘'+COMBINATOR+'’', newCOMBINATOR(COMBINATOR))
        }
    })


    describe('the toString functionality', function() {

        it('should be equivalent to the parsed selector string', function() {
            var selector = 'c, b,  .class,  #id[name="value"],  [aa~=value]'
            var toString = 'c, b, *.class, *#id[name="value"], *[aa~="value"]'

            s = PARSE(selector)
            expect('' + s).to.equal(toString)
        });

    })

})

}())
