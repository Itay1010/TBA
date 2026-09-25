import { useMemo } from "react"
import NotificationPopup from "./NotificationPopup"
import { Info, CircleX, TriangleAlert } from "lucide-react"
import { NOTIFICATION_TYPES } from "../../constants/notifications"

const NOTIFICATION_CONFIG = {
    [NOTIFICATION_TYPES.INFO]: { icon: Info, variant: 'info' },
    [NOTIFICATION_TYPES.WARN]: { icon: TriangleAlert, variant: 'warn' },
    [NOTIFICATION_TYPES.ERROR]: { icon: CircleX, variant: 'error' },
}

export default function NotificationsArea({ ntfs, closeFn }) {
    const hasNtfs = useMemo(() => Object.keys(ntfs ?? {}).length > 0, [ntfs])

    return (
        <div className="notifications-area" dir="rtl" style={{ visibility: hasNtfs ? 'visible' : 'hidden' }}>
            {hasNtfs && Object.entries(ntfs).map(([id, ntf]) => {
                const config = NOTIFICATION_CONFIG[ntf.type] || NOTIFICATION_CONFIG[NOTIFICATION_TYPES.INFO]
                return (
                    <NotificationPopup
                        key={id}
                        id={id}
                        title={ntf.title}
                        text={ntf.text}
                        Icon={config.icon}
                        variant={config.variant}
                        closeFn={closeFn}
                    />
                )
            })}
        </div>
    )
}