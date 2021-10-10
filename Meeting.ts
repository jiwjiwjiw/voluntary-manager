class Meeting {
    constructor(
        readonly date: Date,
        readonly subject: string,
        readonly venue: string,
        readonly author: Person,
        readonly attending: Person[],
        readonly excused: Person[],
        readonly missing: Person[] ) {
    } 
}