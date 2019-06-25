import bookDetails from './data/bookDetails'
import generousBookNames from './data/generousBookNames'

interface IReferenceObject {
    book:string|null;
    chapter:string|null;
    verse:string|null;
}

interface IRangeObject {
    book:string|null;
    startChapter:string|null;
    startVerse:string|null;
    endChapter:string|null;
    endVerse:string|null;
}

interface IComplexReferenceObject {
    book: string|null;
    ranges: IRangeObject[];
}

class ReferenceParser {
    private defaults:IReferenceObject

    constructor({defaults = { book: null, chapter: null, verse: null }}:{defaults?: IReferenceObject}={}) {
        let { book, chapter, verse } = defaults
        this.defaults = { book, chapter, verse }
    }

    public parse(referenceString:string):IReferenceObject|false {
        const matches = referenceString.match(/((?:(?:\d)[^a-zA-Z\d\s:]*)?[a-zA-Z-_\s]+)([^a-zA-Z\d:]*(\d+)(\D*(\d+[a-g]?|end))?)?/)
        return matches ? {
            book: this._matchBook(matches[1]) || this.defaults.book,
            chapter: matches[3] ? matches[3] : this.defaults.chapter,
            verse: matches[5] ? matches[5] : this.defaults.verse
        } : false
    }
    
    public parseComplexReference(referenceString : string) : IComplexReferenceObject|false {
        const references = referenceString.split(/\s*[;,]\s*/);
        
        if (!references) return false;
        
        const [beginning, ...others] = references;
        
        const firstPart = this.parseRange(beginning);
        
        if (!firstPart) return false;
        
        const output : IComplexReferenceObject = {
            book: firstPart.book,
            ranges: [],
        };
        
        let currentChapter = firstPart.endChapter || firstPart.startChapter;
        
        output.ranges = [
            firstPart,
            ...others.reduce((accumulator : IRangeObject[], ref) => {
                let newRef : IRangeObject|false;
              
                if (ref.match(/^\d+[:.]\d/)) { // chapter ref provided
                    newRef = this.parseRange(firstPart.book + ' ' + ref);
                } else { // no chapter ref provided
                    newRef = this.parseRange(firstPart.book + ' ' + currentChapter + ':' + ref);
                }
                
                if (newRef) {
                    accumulator.push(newRef);
                             
                    currentChapter = newRef.endChapter || newRef.startChapter;
                }
              
                return accumulator;
            }, []),
        ];
        
        return output;
    }
    
    public parseRange(referenceString:string):IRangeObject|false {
        const matches = referenceString.split(/[-–—]/, 2);
        
        if (!matches.length) return false;
        
        const beginning = this.parse(referenceString);
        if (beginning === false) return false;
        
        if (matches.length === 1) {
            return {
              book: beginning.book,
              startChapter: beginning.chapter,
              endChapter: null,
              startVerse: beginning.verse,
              endVerse: null
            };
        } else {
            let end : IReferenceObject|false;

            if (matches[1].match(/^\d+[:.]/)) { // a chapter reference is provided
              end = this.parse(beginning.book + ' ' + matches[1]);
            } else { // the same chapter is used
              end = this.parse(beginning.book + ' ' + beginning.chapter + ':' + matches[1]);
            }
            
            if (end === false) {
              end = {
                book: null,
                chapter: null,
                verse: null,
              }
            }
            
            return {
              book: beginning.book,
              startChapter: beginning.chapter,
              endChapter: end.chapter,
              startVerse: beginning.verse,
              endVerse: end.verse
            };
        }
      
        //const groups = referenceString.split(/\s*[;,]\s*/);
    }

    private _matchBook = (urlBook:string):string|false => {
        // first see if we can map directly
        const possibleKey = urlBook.replace(/[-_\ ]/g,"").toLowerCase()
        const generousNameList = Object.keys(generousBookNames)
        if (generousNameList.indexOf(possibleKey) > -1) {
            return generousBookNames[possibleKey]
        }

        // now try use regex to guess (return on first match)
        const bookNames = bookDetails.map(b => b.name)
        // let's try a regex on the starting characters of book names
        const r1 = new RegExp(`^${possibleKey}.*`, "i")
        const possibleMatch = bookNames.reduce((a:string|false, v:string) => {
            if (a) return a
            return r1.test(v) ? v : a
        }, false)
        if (possibleMatch) return possibleMatch
        // and if that didn't work, let's try on the generous booknames...
        const possibleMatch2 = Object.keys(generousBookNames).reduce((a:string|false, v:string) => {
            if (a) return a
            return r1.test(v) ? generousBookNames[v] : a
        }, false)
        if (possibleMatch2) return possibleMatch2

        // this is a pretty promiscuous guess but it works on stuff like "1kgs"
        const urlArray = possibleKey.split("")
        const r2 = new RegExp("^" + urlArray.join(".*"), "i")
        const possibleMatch3 = bookNames.reduce((a:string|false, v:string) => {
            if (a) return a
            return r2.test(v) ? v : a
        }, false)
        if (possibleMatch3) return possibleMatch3
        // Okay, we're really having a hard time with this one,
        // we'll have a last ditch try with generous book names
        return Object.keys(generousBookNames).reduce((a:string|false, v:string) => {
            if (a) return a
            return r2.test(v) ? generousBookNames[v] : a
        }, false)
    }
}

export default ReferenceParser
