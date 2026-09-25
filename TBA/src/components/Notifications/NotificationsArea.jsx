import { useContext, useEffect, useMemo, useState } from "react"
import NotificationPopup from "./NotificationPopup"
import { Info, CircleAlert, CircleX, TriangleAlert } from "lucide-react"
import { NOTIFICATION_TYPES } from "../../constants/notifications"


export default function NotificationsArea({ ntfs, closeFn }) {

    const hasNtfs = useMemo(() => Object.keys(ntfs ?? {}).length > 0, [ntfs])

    return <div className="notifications-area" dir="rtl" style={{ visibility: hasNtfs ? 'visible' : 'hidden' }} >
        {hasNtfs && Object.entries(ntfs).map(([id, ntf]) => {
            let icon
            let color
            switch (ntf.type) {
                case NOTIFICATION_TYPES.WARN:
                    icon = TriangleAlert
                    color = 'darkorange'
                    break;
                case NOTIFICATION_TYPES.ERROR:
                    icon = CircleX
                    color = 'red'
                    break;
                case NOTIFICATION_TYPES.INFO:
                default:
                    icon = Info
                    color = 'darkblue'
                    break;
            }
            return <NotificationPopup
                id={id}
                key={id}
                title={ntf.title}
                text={ntf.text}
                Icon={icon}
                color={color}
                closeFn={closeFn}
            />
        })}
    </div>
}