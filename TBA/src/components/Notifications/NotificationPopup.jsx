import { X } from "lucide-react"
export default function NotificationPopup({ id, Icon, title, text, color, closeFn, ...elProps }) {

    return <div
        {...elProps}
        id={id}
        className="notification-popup"
    >
        <button type="button" className="btn-close" onClick={() => typeof closeFn == 'function' ? closeFn(id) : null}><X /></button>
        <div className="icon-container">
            <Icon style={color ? { stroke: color } : {}} />
        </div>
        <span className="title">{title}</span>
        <div className="text">{text}</div>
    </div>
}