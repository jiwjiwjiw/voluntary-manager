class MeetingEntry {
    constructor(
        private creationDate: Date,
        private meetingDate: Date,
        private author: string,
        private title: string,
        private description: string,
        private discussion: string,
        private decision: string,
        private tasks: Task[]
        ) {
        
    }
}