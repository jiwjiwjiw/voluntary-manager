class Parser {
    public topics: Topic[] = []
    public people: Person[] = []
    public meetings: Meeting[] = []
    public tasks: Task[] = []

    parse(): void {
        this.topics = []
        this.people = []
        this.meetings = []
        this.tasks = []
        const peopleSheetValues = SpreadsheetApp.getActive().getSheetByName('Personnes').getDataRange().getValues()
        peopleSheetValues.shift(); // shift removes first line that contains headings
        peopleSheetValues.forEach(row => this.people.push(new Person(row[0], row[1], row[2])))

        const meetingsSheetValues = SpreadsheetApp.getActive().getSheetByName('Réunions').getDataRange().getValues()
        meetingsSheetValues.shift(); // shift removes first line that contains headings
        meetingsSheetValues.forEach(row => {
            const author = this.people.find(x => x.acronym === row[3])
            const attendingAcronyms = row[4].trim().split(' ')
            const attending: Person[] = []
            attendingAcronyms.forEach(acronym => {
                const person = this.people.find(x => x.acronym === acronym)
                if(person) attending.push(person)
            })
            const excusedAcronyms = row[5].trim().split(' ')
            const excused: Person[] = []
            excusedAcronyms.forEach(acronym => {
                const person = this.people.find(x => x.acronym === acronym)
                if(person) excused.push(person)
            })
            const missingAcronyms = row[6].trim().split(' ')
            const missing: Person[] = []
            missingAcronyms.forEach(acronym => {
                const person = this.people.find(x => x.acronym === acronym)
                if(person) missing.push(person)
            })
            this.meetings.push(new Meeting(row[0], row[1], row[2], author, attending, excused, missing))
        })

        const topicsSheetValues = SpreadsheetApp.getActive().getSheetByName('Sujets').getDataRange().getValues()
        topicsSheetValues.shift(); // shift removes first line that contains headings
        topicsSheetValues.forEach(row => {
            const meeting = this.meetings.find(x => x.date === row[1])
            const author = this.people.find(x => x.acronym === row[2])
            let tasks: Task[] = []
            row[7].trim().split('\n').forEach(task => {
                let t = task.trim().split(':').map(s => s.trim())
                const assignee = this.people.find(x => x.acronym === t[0])
                tasks.push(new Task(assignee, t[1], t[2]))
            })
            this.topics.push(new Topic(row[0], meeting, author, row[3], row[4], row[5], row[6], tasks))
            this.tasks = this.tasks.concat(tasks)
        })
    }
}