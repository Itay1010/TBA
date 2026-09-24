import { createContext, useCallback, useContext, useEffect, useState } from "react";
import NotificationsArea from "../components/Notifications/NotificationsArea";

/*
  Notifications are of the following shape: { title: string, text: string, color?: string, icon?: LucideReactComponent }
  NotificationsContext shape: { Notify: (Notification) => void }
*/
const NotificationsContext = createContext(null)

export const NotificationsProvider = ({ children }) => {
    const [ntfs, setNtfs] = useState({})
    useEffect(() => {
        return () => {
            Object.keys(ntfs).forEach(tmid => {
                clearTimeout(tmid)
            })
        }
    }, [])
    const Notify = useCallback((ntf) => {
        const tmid = setTimeout(() => {
            setNtfs(prevNtfs => {
                const newNtfs = { ...prevNtfs }
                delete newNtfs[tmid]
                return newNtfs
            })
        }, 7000)

        setNtfs(prevNtfs => {
            return { ...prevNtfs, [tmid]: ntf }
        })
    })
    
    return <NotificationsContext value={{ Notify }}>
        {children}
        <NotificationsArea ntfs={ntfs} />
    </NotificationsContext>
}


export const useNotification = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}