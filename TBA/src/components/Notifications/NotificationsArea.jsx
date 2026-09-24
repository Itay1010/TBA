import { useContext, useEffect, useState } from "react"
import NotificationPopup from "./NotificationPopup"
import { Info } from "lucide-react"

export default function NotificationsArea({ ntfs }) {
    
    return <div className="notifications-area">
            {Object.entries(ntfs ?? {}).map(([id, notif]) => {
                return <NotificationPopup
                    id={id}
                    key={id}
                    title={notif.title}
                    text={notif.text}
                    Icon={notif.icon ?? Info}
                />
            })}
    </div>
}