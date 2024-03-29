import { component$, useServerMount$, useStore } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { isIP } from "is-ip";
import { db } from "../../libs/firebase";
import TipMessage from "~/components/TipMessage";

interface Iflags {
  id: string;
  title: string;
  body: string;
  flag: string;
}

export default component$(() => {
  const location = useLocation();
  const list = useStore([{ ip: "", points: 0, clears: [] as Array<string> }]);
  const f = useStore({
    flags: null as Iflags[] | null,
  });
  const InputFlag = useStore({ input: null as unknown as string });
  if (location.query.ip === undefined) return <>Errno</>
  if (!isIP(location.query.ip)) return <>Errno</>;

  useServerMount$(async () => {
    f.flags = await (
      await fetch(
        location.href.match(
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}/
        )![0] + `/flags.json`,
        {}
      )
    ).json();

    const querySnapshot = await getDocs(collection(db, "flags"));
    querySnapshot.forEach((doc) => {
      //console.log(`${doc.id} => ${doc.data().users}`);
      doc.data().users.map((e: { ip: any; clears: string[] }) => {
        list.push({ ip: e.ip, points: e.clears.length, clears: e.clears });
      });
    });
    list.sort(function (a, b) {
      return b.points.valueOf() - a.points.valueOf();
    });
  });

  return (
    <div style={{ textAlign: "center" }}>
      <h1
        style={{
          textAlign: "center",
          "margin-bottom": "1em",
          "font-family": "MaplestoryOTFBold",
        }}
      >
        깃발
      </h1>
      <div class="input-group mb-2">
        <input
          id="inputValue"
          type="text"
          class="form-control"
          placeholder="Put flag"
          aria-label="Put flag"
          aria-describedby="basic-addon2"
          style={{
            "margin-bottom": "0.8em",
            "font-family": "MaplestoryOTFBold",
          }}
          onChange$={(e) => {
            InputFlag.input = e.target.value;
          }}
        />
        <div class="input-group-append">
          <button
            class="btn btn-outline-secondary"
            type="button"
            onClick$={() => {
              if (f.flags === null) return;
              const flags = [] as string[];
              f.flags.map((e) => {
                if (e.flag === InputFlag.input) flags.push(e.flag);
              });
              if (flags.includes(InputFlag.input)) {
                const user = list.find((e) => e.ip === location.query.ip);

                if (user === undefined) {
                  const users = list.map((e) => {
                    return { ip: e.ip, clears: e.clears }
                  })
                  users.push({
                    ip: location.query.ip,
                    clears: [InputFlag.input],
                  })
                  setDoc(doc(db, "flags", "list"), {
                    users: users
                  });
                } else {
                  if (!user.clears.includes(InputFlag.input)) {
                    user.clears.push(InputFlag.input);
                    const users = list.map((e) => {
                      return { ip: e.ip, clears: e.clears }
                    })
                    setDoc(doc(db, "flags", "list"), {
                      users: users
                    });
                  }
                }
              }
            }}
          >
            Enter
          </button>
        </div>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Ip</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        {list.map((e, index) => {
          if (e.ip === "" || e.clears.length === 0) return;
          else
            return (
              <tbody>
                <tr>
                  <th scope="row">{index + 1}</th>
                  <td>{e.ip}</td>
                  <td>{e.points}</td>
                </tr>
              </tbody>
            );
        })}
      </table>
      <TipMessage message="F2를 누르면 메인 페이지로 이동됩니다." />
    </div>
  );
});
