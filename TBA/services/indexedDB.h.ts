type Days = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

type Block = {
    "id": string,
    "title": string,
    "startTime": string,
    "endTime": string,
    "day": string,
    "color": string
}

type Schedule = {
    [K in Days]: Block[]
};