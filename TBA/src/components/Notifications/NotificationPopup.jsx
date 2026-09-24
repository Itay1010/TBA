
export default function NotificationPopup({ Icon, title, text, color, ...elProps }) {

    return <div
        {...elProps}
        className="notification-popup"
        style={color ? { backgroundColor: color } : {}}>
        <div className="icon-container">
            <Icon />
        </div>
        <span className="title">{title}</span>
        <div className="text">{text}</div>
    </div>
}