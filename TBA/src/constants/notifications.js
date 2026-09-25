export const NOTIFICATION_TYPES = {
    types: ['info', 'warn', 'error'],
    get INFO() {
        return this.types[0]
    },
    get WARN() {
        return this.types[1]
    },
    get ERROR() {
        return this.types[2]
    }
}