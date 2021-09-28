class MeetingMinutes {
    constructor(
        private date: Date,
        private subject: string,
        private venue: string,
        private author: string,
        private attending: string[],
        private excused: string[],
        private missing: string[] ) {
    }
}