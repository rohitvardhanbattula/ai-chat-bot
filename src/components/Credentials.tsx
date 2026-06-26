import { useState } from "react";

export default function Credentials(
    { onConnect }
) {

    const [sapUrl,setSapUrl]=useState("");
    const [sapUser,setSapUser]=useState("");
    const [sapPassword,setSapPassword]=useState("");

    return (
        <div>

            <input
                placeholder="SAP URL"
                value={sapUrl}
                onChange={e=>setSapUrl(e.target.value)}
            />

            <input
                placeholder="User"
                value={sapUser}
                onChange={e=>setSapUser(e.target.value)}
            />

            <input
                type="password"
                placeholder="Password"
                value={sapPassword}
                onChange={e=>setSapPassword(e.target.value)}
            />

            <button
                onClick={()=>
                    onConnect({
                        sapUrl,
                        sapUser,
                        sapPassword
                    })
                }
            >
                Connect
            </button>

        </div>
    );
}