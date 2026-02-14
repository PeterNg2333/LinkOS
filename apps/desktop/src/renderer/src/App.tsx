import { FunctionalComponent } from "preact"
import { useState } from "preact/hooks"

const App: FunctionalComponent = () => {
    const [count, setCount] = useState(0)
    return (
        <div>
            <h1>LinkOS Desktop</h1>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    )
}

export default App