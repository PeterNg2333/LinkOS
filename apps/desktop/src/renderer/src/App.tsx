import { FunctionalComponent } from "preact"
import { useState } from "preact/hooks"

import ChatWindow from "@/components/ChatWindow"
import cn from "@/lib/utils/cn"


const App: FunctionalComponent = () => {
    return (
        <div className={cn(["flex flex-col items-center justify-center h-screen"])}>
            <div className={cn(["fixed bottom-2.5 right-2"])}>
                <ChatWindow width={400} height={500} />
            </div>
        </div>
    )
}

export default App