import { X } from "lucide-react"

export default function NotificationPopup({ id, Icon, title, text, variant = 'info', closeFn, ...elProps }) {
    return (
        <div
            {...elProps}
            id={id}
            className={`notification-popup notification-${variant}`}
        >
            <button type="button" className="btn-close" onClick={() => typeof closeFn === 'function' ? closeFn(id) : null}>
                <X size={16} />
            </button>
            {Icon && (
                <div className="icon-container">
                    <Icon size={20} />
                </div>
            )}
            <span className="title">{title}</span>
            <div className="text">{text}</div>
        </div>
    )
}