import { useEffect, useMemo, useRef, useState } from "react";

/**
 * PM Copilot — Lite (Guided Mode付き, no shadcn)
 * ------------------------------------------------------
 * ・Tailwindだけで動く最小構成
 * ・初心者PM向け「かんたんガイド（Guided）」タブを追加
 *   1) 名前と目的 → 2) 期間 → 3) 関係者 → 4) タスク雛形 → 5) 期日設定 → 6) リスク → 7) スタンドアップ → 8) 完了
 * ・右側にAIアシスタント（/api/chatが無くてもモック応答）
 * ・ローカル保存＋JSONインポ/エクスポート
 */

// -------------- helpers --------------
const uid = () => Math.random().toString(36).slice(2, 10);
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };

async function chatWithBackend(body){
  try{
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 9000);
    const res = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body), signal: ctrl.signal});
    clearTimeout(t);
    if(!res.ok) throw new Error('bad status');
    const data = await res.json();
    return data.reply || JSON.stringify(data);
  }catch{
    const q = body.message||'';
    if(/risk|リスク/i.test(q)) return '影響(Impact)×発生確率(Likelihood)で優先度を決めましょう。高×高は即アクション。中〜低はトリガーを決めて監視。';
    if(/スケジュール|timeline|gantt|スプリント/i.test(q)) return '重要マイルストーン→反復→個別タスクの順で粗→細に。レビュー/調達は前倒しに。';
    if(/ステークホルダー|stakeholder/i.test(q)) return '期待値・関心度・影響度で仕分け。高影響×高関心には週次レポート＋早期相談。';
    return '（モック応答）/api/chat を実装すると本番AI応答になります。質問を具体化すると実行手順まで提案します。';
  }
}

// -------------- main --------------
export default function App(){
  const [projects, setProjects] = useState(()=>load('pmc_projects', []));
  const [activeId, setActiveId] = useState(()=>load('pmc_active',''));
  const [knowledge, setKnowledge] = useState(()=>load('pmc_knowledge',''));
  const [tab, setTab] = useState('guided');

  useEffect(()=>save('pmc_projects',projects),[projects]);
  useEffect(()=>save('pmc_active',activeId),[activeId]);
  useEffect(()=>save('pmc_knowledge',knowledge),[knowledge]);

  const active = useMemo(()=>projects.find(p=>p.id===activeId)||null,[projects,activeId]);

  const addProject = ()=>{
    const p = { id: uid(), name: `New Project ${projects.length+1}`, start:'', end:'', goals:'', stakeholders:[], tasks:[], risks:[], standups:[] };
    setProjects(v=>[...v,p]); setActiveId(p.id); setTab('guided');
  };
  const updateActive = (patch)=>{ if(!active) return; setProjects(v=>v.map(p=>p.id===active.id?{...p,...patch}:p)); };
  const removeProject = (id)=>{ setProjects(v=>v.filter(p=>p.id!==id)); if(activeId===id) setActiveId(projects[0]?.id||''); };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="font-bold tracking-tight">PM Copilot — Lite</div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 ml-2">Beginner Guide</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="border px-3 py-1.5 rounded-md" onClick={addProject}>New project</button>
            {projects.length>0 && (
              <select className="border px-2 py-1.5 rounded-md" value={activeId} onChange={e=>setActiveId(e.target.value)}>
                {projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {active && <ExportImport projects={projects} setProjects={setProjects} setActiveId={setActiveId} />}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-8 space-y-4">
          {!active ? (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="text-xl font-semibold">ようこそ 👋</h2>
              <p className="text-slate-700 mt-1">初心者PMでも安心。ガイドに沿って1つずつ進めます。まずはプロジェクトを作成してください。</p>
              <div className="mt-4"><button className="px-4 py-2 rounded-md bg-blue-600 text-white" onClick={addProject}>新規プロジェクト</button></div>
            </div>
          ) : (
            <div className="space-y-4">
              <ProjectHeader project={active} onChange={updateActive} onDelete={()=>removeProject(active.id)} />

              <div className="bg-white border rounded-xl p-2 flex flex-wrap gap-2">
                {['guided','plan','timeline','risks','standup','knowledge'].map(k=> (
                  <button key={k} onClick={()=>setTab(k)} className={`px-3 py-1.5 rounded-md text-sm border ${tab===k? 'bg-slate-900 text-white':'bg-white'}`}>
                    {k==='guided'? 'Guided': k==='plan'? 'Plan' : k==='timeline'? 'Timeline' : k==='risks'? 'Risks' : k==='standup'? 'Stand-up' : 'Knowledge'}
                  </button>
                ))}
              </div>

              {tab==='guided' && <GuidedMode project={active} onChange={updateActive} setTab={setTab} />}
              {tab==='plan' && <PlanningBoard project={active} onChange={updateActive} />}
              {tab==='timeline' && <TimelineView project={active} />}
              {tab==='risks' && <RiskBoard project={active} onChange={updateActive} />}
              {tab==='standup' && <StandupBoard project={active} onChange={updateActive} />}
              {tab==='knowledge' && <KnowledgeBase knowledge={knowledge} setKnowledge={setKnowledge} />}
            </div>
          )}
        </section>
        <aside className="col-span-12 lg:col-span-4">
          <AssistantPanel active={active} knowledge={knowledge} />
        </aside>
      </main>
    </div>
  );
}

function ProjectHeader({ project, onChange, onDelete }){
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <label className="text-xs text-slate-500">プロジェクト名</label>
          <input className="w-full border rounded-md px-3 py-2" value={project.name} onChange={e=>onChange({name:e.target.value})}/>
        </div>
        <button className="border px-3 py-2 rounded-md" onClick={onDelete}>Delete</button>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500">開始日</label>
          <div className="mt-1"><input type="date" className="w-full border rounded-md px-3 py-2" value={project.start||''} onChange={e=>onChange({start:e.target.value})}/></div>
        </div>
        <div>
          <label className="text-xs text-slate-500">終了日</label>
          <div className="mt-1"><input type="date" className="w-full border rounded-md px-3 py-2" value={project.end||''} onChange={e=>onChange({end:e.target.value})}/></div>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500">目的 / 成功基準</label>
          <textarea rows={3} className="mt-1 w-full border rounded-md px-3 py-2" value={project.goals||''} onChange={e=>onChange({goals:e.target.value})} placeholder="例: 11/30までにv1、NPS45+、コスト±5%以内"/>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500">関係者（カンマ区切り）</label>
          <input className="mt-1 w-full border rounded-md px-3 py-2" value={(project.stakeholders||[]).join(', ')} onChange={e=>onChange({stakeholders: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="例: 発注者A, エンジニアB, QA C"/>
        </div>
      </div>
    </div>
  );
}

// ---------------- Guided Mode ----------------
function GuidedMode({ project, onChange, setTab }){
  const [step, setStep] = useState(1);

  const total = 8;
  const canNext = useMemo(()=>{
    if(step===1) return !!project.name && !!project.goals;
    if(step===2) return !!project.start && !!project.end;
    if(step===3) return (project.stakeholders||[]).length>0;
    if(step===4) return (project.tasks||[]).length>0;
    if(step===5) return (project.tasks||[]).filter(t=>t.start && t.due).length>=3 || (project.tasks||[]).length>=1; // 最低1件に緩和
    if(step===6) return (project.risks||[]).length>0;
    if(step===7) return (project.standups||[]).length>0;
    return true;
  },[step,project]);

  const next = ()=> setStep(s=> Math.min(total, s+1));
  const back = ()=> setStep(s=> Math.max(1, s-1));

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">かんたんガイド（{step}/{total}）</div>
        <div className="text-xs text-slate-500">迷ったら右のAIに質問できます</div>
      </div>
      <div className="mt-2 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
        <div className="h-2 bg-blue-600" style={{ width: `${Math.round(step/total*100)}%` }} />
      </div>

      <div className="mt-4 space-y-3">
        {step===1 && (
          <div>
            <h3 className="text-lg font-semibold">① 名前と目的を決めましょう</h3>
            <p className="text-slate-700 text-sm mb-3">「このプロジェクトで何を達成したいか」を1〜2行で。あとから変えてOKです。</p>
            <label className="text-xs text-slate-500">名前</label>
            <input className="w-full border rounded-md px-3 py-2 mb-2" value={project.name} onChange={e=>onChange({name:e.target.value})}/>
            <label className="text-xs text-slate-500">目的 / 成功条件</label>
            <textarea rows={3} className="w-full border rounded-md px-3 py-2" value={project.goals||''} onChange={e=>onChange({goals:e.target.value})} placeholder="例: 11/30までにv1リリース、NPS45+"/>
          </div>
        )}

        {step===2 && (
          <div>
            <h3 className="text-lg font-semibold">② 期間を入れましょう</h3>
            <p className="text-slate-700 text-sm mb-3">開始日と終了日を入れると、進捗の見通しが立ちます。</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><div className="text-xs text-slate-500">開始日</div><input type="date" className="w-full border rounded-md px-3 py-2" value={project.start||''} onChange={e=>onChange({start:e.target.value})}/></div>
              <div><div className="text-xs text-slate-500">終了日</div><input type="date" className="w-full border rounded-md px-3 py-2" value={project.end||''} onChange={e=>onChange({end:e.target.value})}/></div>
            </div>
          </div>
        )}

        {step===3 && (
          <div>
            <h3 className="text-lg font-semibold">③ 関係者（連絡すべき人）を入れましょう</h3>
            <p className="text-slate-700 text-sm mb-3">例: 発注者A, エンジニアB, デザイナーC</p>
            <input className="w-full border rounded-md px-3 py-2" value={(project.stakeholders||[]).join(', ')} onChange={e=>onChange({stakeholders: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
            <div className="text-xs text-slate-500 mt-2">* 後から追加・修正できます</div>
          </div>
        )}

        {step===4 && (
          <Step4Tasks project={project} onChange={onChange} />
        )}

        {step===5 && (
          <Step5Dates project={project} onChange={onChange} />
        )}

        {step===6 && (
          <Step6Risks project={project} onChange={onChange} />
        )}

        {step===7 && (
          <Step7Standup project={project} onChange={onChange} />
        )}

        {step===8 && (
          <div>
            <h3 className="text-lg font-semibold">⑧ 完了！次の使い方</h3>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>「Timeline」で進捗バーを確認</li>
              <li>「Risks」で対策を追記</li>
              <li>「Stand-up」で毎日の記録（昨日/今日/ブロッカー）</li>
              <li>右のAIに「週次レポート案を作って」など質問</li>
            </ul>
            <div className="mt-4"><button className="px-4 py-2 rounded-md border" onClick={()=>setTab('plan')}>Planタブへ移動</button></div>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-between">
        <button className="px-4 py-2 rounded-md border" onClick={back} disabled={step===1}>戻る</button>
        <button className={`px-4 py-2 rounded-md ${canNext? 'bg-blue-600 text-white':'bg-slate-200 text-slate-500 cursor-not-allowed'}`} onClick={next} disabled={!canNext}>{step===total? '完了':'次へ'}</button>
      </div>
    </div>
  );
}

function Step4Tasks({ project, onChange }){
  const DEFAULT_TEMPLATES = [
    { title:'Kickoff（キックオフMTG）', phase:'Initiation' },
    { title:'目的と成功基準の合意', phase:'Initiation' },
    { title:'WBSのたたき作成', phase:'Planning' },
    { title:'スケジュール作成と担当割り当て', phase:'Planning' },
    { title:'デイリースタンドアップ開始', phase:'Execution' },
    { title:'週次ステータス報告', phase:'Monitoring' },
    { title:'受け入れテスト・リリース判定', phase:'Closure' },
  ];
  const addTemplates = ()=> onChange({ tasks: [...(project.tasks||[]), ...DEFAULT_TEMPLATES.map(t=>({ id:uid(), status:'todo', start:'', due:'', ...t}))] });
  const removeAll = ()=> onChange({ tasks: [] });

  return (
    <div>
      <h3 className="text-lg font-semibold">④ タスク雛形を一括で入れましょう</h3>
      <p className="text-slate-700 text-sm mb-3">迷ったらまず雛形でOK。あとで消したり直せます。</p>
      <div className="flex gap-2">
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white" onClick={addTemplates}>テンプレ生成</button>
        {!!(project.tasks||[]).length && <button className="px-4 py-2 rounded-md border" onClick={removeAll}>全部消す</button>}
      </div>
      <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
        {(project.tasks||[]).slice(0,5).map(t=> <li key={t.id}>{t.title}</li>)}
        {!project.tasks?.length && <li className="text-slate-500">まだタスクがありません</li>}
      </ul>
    </div>
  );
}

function Step5Dates({ project, onChange }){
  const setDates = (id, start, due)=> onChange({ tasks: project.tasks.map(t=>t.id===id?{...t,start,due}:t) });
  const first = (project.tasks||[]).slice(0,3);
  return (
    <div>
      <h3 className="text-lg font-semibold">⑤ 期日を入れましょう（まずは3件）</h3>
      <p className="text-slate-700 text-sm mb-3">開始/終了を入れると、進捗バーが動きます。まずは上から3件だけでOK。</p>
      {first.length? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {first.map(t=> (
            <div key={t.id} className="border rounded-lg p-3">
              <div className="font-medium mb-2 truncate" title={t.title}>{t.title}</div>
              <div className="text-xs text-slate-500">Start</div>
              <input type="date" className="w-full border rounded px-2 py-1 mb-2" value={t.start||''} onChange={e=>setDates(t.id, e.target.value, t.due)} />
              <div className="text-xs text-slate-500">Due</div>
              <input type="date" className="w-full border rounded px-2 py-1" value={t.due||''} onChange={e=>setDates(t.id, t.start, e.target.value)} />
            </div>
          ))}
        </div>
      ) : <div className="text-slate-500">先に「④ タスク雛形」を実行してください。</div>}
    </div>
  );
}

function Step6Risks({ project, onChange }){
  const [title,setTitle] = useState('');
  const [impact,setImpact] = useState('Medium');
  const [likelihood,setLikelihood] = useState('Medium');
  const add = ()=>{ if(!title.trim()) return; const r={ id:uid(), title:title.trim(), impact, likelihood, mitigation:'', open:true }; onChange({ risks:[...(project.risks||[]), r]}); setTitle(''); };
  return (
    <div>
      <h3 className="text-lg font-semibold">⑥ リスク（心配ごと）を1つ書きましょう</h3>
      <p className="text-slate-700 text-sm mb-3">例: 「外部APIの遅延」「要件の追加」など。後で増やしてOK。</p>
      <div className="flex flex-col md:flex-row gap-2">
        <select className="border rounded-md px-3 py-2" value={impact} onChange={e=>setImpact(e.target.value)}>
          {['Low','Medium','High'].map(v=> <option key={v} value={v}>Impact: {v}</option>)}
        </select>
        <select className="border rounded-md px-3 py-2" value={likelihood} onChange={e=>setLikelihood(e.target.value)}>
          {['Low','Medium','High'].map(v=> <option key={v} value={v}>Likelihood: {v}</option>)}
        </select>
        <input className="flex-1 border rounded-md px-3 py-2" placeholder="リスク内容" value={title} onChange={e=>setTitle(e.target.value)} />
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white" onClick={add}>追加</button>
      </div>
      <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
        {(project.risks||[]).map(r=> <li key={r.id}>{r.title}（{r.impact}/{r.likelihood}）</li>)}
        {!(project.risks||[]).length && <li className="text-slate-500">まだ登録がありません</li>}
      </ul>
    </div>
  );
}

function Step7Standup({ project, onChange }){
  const [yesterday,setYesterday] = useState('');
  const [today,setToday] = useState('');
  const [blockers,setBlockers] = useState('');
  const add = ()=>{ const s = { id:uid(), date:new Date().toISOString().slice(0,10), yesterday, today, blockers }; onChange({ standups:[s, ...(project.standups||[])] }); setYesterday(''); setToday(''); setBlockers(''); };
  return (
    <div>
      <h3 className="text-lg font-semibold">⑦ 今日の計画を60秒でメモ</h3>
      <p className="text-slate-700 text-sm mb-3">昨日/今日/ブロッカー（困りごと）を書いて「保存」。これで毎日の習慣ができます。</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><div className="text-xs text-slate-500">Yesterday</div><textarea rows={4} className="w-full border rounded-md px-3 py-2" value={yesterday} onChange={e=>setYesterday(e.target.value)} /></div>
        <div><div className="text-xs text-slate-500">Today</div><textarea rows={4} className="w-full border rounded-md px-3 py-2" value={today} onChange={e=>setToday(e.target.value)} /></div>
        <div><div className="text-xs text-slate-500">Blockers</div><textarea rows={4} className="w-full border rounded-md px-3 py-2" value={blockers} onChange={e=>setBlockers(e.target.value)} /></div>
      </div>
      <div className="text-right mt-3"><button className="px-4 py-2 rounded-md bg-blue-600 text-white" onClick={add}>保存</button></div>
      {(project.standups||[]).length>0 && <div className="text-sm text-slate-700 mt-2">直近の記録が保存されました。</div>}
    </div>
  );
}

// ---------------- Other tabs ----------------
const PHASES = ['Initiation','Planning','Execution','Monitoring','Closure'];

function PlanningBoard({ project, onChange }){
  const [title,setTitle] = useState('');
  const [phase,setPhase] = useState('Initiation');

  const DEFAULT_TEMPLATES = [
    { title:'Kickoff meeting', phase:'Initiation' },
    { title:'Define scope & success criteria', phase:'Initiation' },
    { title:'Create WBS & estimates', phase:'Planning' },
    { title:'Build schedule & assign owners', phase:'Planning' },
    { title:'Stand-ups begin', phase:'Execution' },
    { title:'Weekly status report', phase:'Monitoring' },
    { title:'UAT & acceptance', phase:'Closure' },
  ];

  const addTask = ()=>{
    if(!title.trim()) return;
    const t = { id: uid(), title: title.trim(), phase, status:'todo', start:'', due:'' };
    onChange({ tasks: [...project.tasks, t] }); setTitle('');
  };
  const fromTemplates = ()=> onChange({ tasks: [...project.tasks, ...DEFAULT_TEMPLATES.map(t=>({ id:uid(), status:'todo', start:'', due:'', ...t}))] });

  const setStatus = (id,status)=> onChange({ tasks: project.tasks.map(t=>t.id===id?{...t,status}:t) });
  const setDates = (id, start, due)=> onChange({ tasks: project.tasks.map(t=>t.id===id?{...t,start, due}:t) });
  const remove = (id)=> onChange({ tasks: project.tasks.filter(t=>t.id!==id) });

  const grouped = useMemo(()=>{
    const m = {Initiation:[],Planning:[],Execution:[],Monitoring:[],Closure:[]};
    for(const t of project.tasks) (m[t.phase]||m.Initiation).push(t);
    return m;
  },[project.tasks]);

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <div className="text-sm text-slate-600 mb-2">テンプレから生成 or 個別追加</div>
        <div className="flex flex-col md:flex-row gap-2">
          <select className="border rounded-md px-3 py-2" value={phase} onChange={e=>setPhase(e.target.value)}>
            {PHASES.map(p=> <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="flex-1 border rounded-md px-3 py-2" placeholder="タスク名" value={title} onChange={e=>setTitle(e.target.value)} />
          <button className="px-3 py-2 rounded-md bg-blue-600 text-white" onClick={addTask}>追加</button>
          <button className="px-3 py-2 rounded-md border" onClick={fromTemplates}>テンプレ生成</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PHASES.map(p=> (
          <div key={p} className="bg-white border rounded-xl p-4">
            <div className="font-semibold mb-3">{p} <span className="text-xs text-slate-500">{grouped[p]?.length||0} tasks</span></div>
            <div className="space-y-3">
              {(grouped[p]||[]).map(t=> (
                <div key={t.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{t.title}</div>
                    <div className="flex items-center gap-2">
                      <select className="text-xs border rounded px-2 py-1" value={t.status} onChange={e=>setStatus(t.id, e.target.value)}>
                        <option value="todo">To do</option>
                        <option value="doing">Doing</option>
                        <option value="done">Done</option>
                      </select>
                      <button className="text-sm text-rose-600" onClick={()=>remove(t.id)}>削除</button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">Start</div>
                      <input type="date" className="w-full border rounded px-2 py-1" value={t.start||''} onChange={e=>setDates(t.id, e.target.value, t.due)} />
                    </div>
                    <div>
                      <div className="text-slate-500">Due</div>
                      <input type="date" className="w-full border rounded px-2 py-1" value={t.due||''} onChange={e=>setDates(t.id, t.start, e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              {!(grouped[p]||[]).length && <div className="text-sm text-slate-500">タスクなし</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineView({ project }){
  const completion = useMemo(()=>{
    const total = project.tasks.length||1;
    const done = project.tasks.filter(t=>t.status==='done').length;
    return Math.round(done/total*100);
  },[project.tasks]);

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="font-semibold mb-2">Timeline (rough)</div>
      <div className="text-sm text-slate-600 mb-2">「Done」の割合を進捗バーで表示します。各タスクのStart/Dueを設定してください。</div>
      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
        <div className="h-3 bg-blue-600" style={{ width: `${completion}%` }} />
      </div>
      <div className="text-xs text-slate-600 mt-1">{completion}% done</div>
      <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
        {project.tasks.map(t=> (
          <div key={t.id} className="flex justify-between border rounded-lg px-3 py-2">
            <div className="truncate max-w-[60%]">{t.title}</div>
            <div className="text-slate-500">{t.start||'—'} → {t.due||'—'}</div>
          </div>
        ))}
        {!project.tasks.length && <div className="text-slate-500">期間が設定されたタスクがありません。</div>}
      </div>
    </div>
  );
}

function RiskBoard({ project, onChange }){
  const [title,setTitle] = useState('');
  const [impact,setImpact] = useState('Medium');
  const [likelihood,setLikelihood] = useState('Medium');

  const DEFAULT_RISKS = [
    { title:'Scope creep without change control', impact:'High', likelihood:'Medium' },
    { title:'Key dependency delay (vendor/API)', impact:'Medium', likelihood:'Medium' },
    { title:'Single-point-of-failure on staff', impact:'High', likelihood:'Low' },
  ];

  const score = (r)=> (r.impact==='High'?3:r.impact==='Medium'?2:1) * (r.likelihood==='High'?3:r.likelihood==='Medium'?2:1);
  const add = ()=>{ if(!title.trim()) return; const r={ id:uid(), title:title.trim(), impact, likelihood, mitigation:'', open:true }; onChange({ risks:[...project.risks, r]}); setTitle(''); };
  const seed = ()=> onChange({ risks:[...project.risks, ...DEFAULT_RISKS.map(r=>({ id:uid(), mitigation:'', open:true, ...r }))]});
  const toggle = (id,open)=> onChange({ risks: project.risks.map(r=>r.id===id?{...r, open}:r)});
  const setMit = (id,mitigation)=> onChange({ risks: project.risks.map(r=>r.id===id?{...r, mitigation}:r)});
  const remove = (id)=> onChange({ risks: project.risks.filter(r=>r.id!==id)});

  const sorted = [...project.risks].sort((a,b)=> score(b)-score(a));

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-2">
          <select className="border rounded-md px-3 py-2" value={impact} onChange={e=>setImpact(e.target.value)}>
            {['Low','Medium','High'].map(v=> <option key={v} value={v}>Impact: {v}</option>)}
          </select>
          <select className="border rounded-md px-3 py-2" value={likelihood} onChange={e=>setLikelihood(e.target.value)}>
            {['Low','Medium','High'].map(v=> <option key={v} value={v}>Likelihood: {v}</option>)}
          </select>
          <input className="flex-1 border rounded-md px-3 py-2" placeholder="リスク内容" value={title} onChange={e=>setTitle(e.target.value)} />
          <button className="px-3 py-2 rounded-md bg-blue-600 text-white" onClick={add}>追加</button>
          <button className="px-3 py-2 rounded-md border" onClick={seed}>例を入れる</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map(r=> (
          <div key={r.id} className={`bg-white border rounded-xl p-4 ${r.open? '':'opacity-70'}`}>
            <div className="font-semibold">{r.title} <span className="text-xs text-slate-500">Score {score(r)}</span></div>
            <div className="text-sm text-slate-600">Impact: {r.impact} / Likelihood: {r.likelihood}</div>
            <div className="mt-2">
              <div className="text-xs text-slate-500 mb-1">Mitigation</div>
              <textarea rows={2} className="w-full border rounded-md px-3 py-2" value={r.mitigation||''} onChange={e=>setMit(r.id, e.target.value)} placeholder="対策やトリガー条件、担当者など"/>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={r.open} onChange={e=>toggle(r.id, e.target.checked)} /> Open</label>
              <button className="text-rose-600" onClick={()=>remove(r.id)}>削除</button>
            </div>
          </div>
        ))}
        {!sorted.length && <div className="text-slate-500">リスクはまだありません。</div>}
      </div>
    </div>
  );
}

function StandupBoard({ project, onChange }){
  const [yesterday,setYesterday] = useState('');
  const [today,setToday] = useState('');
  const [blockers,setBlockers] = useState('');
  const add = ()=>{
    const s = { id:uid(), date:new Date().toISOString().slice(0,10), yesterday, today, blockers };
    onChange({ standups:[s, ...project.standups] }); setYesterday(''); setToday(''); setBlockers('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-slate-500">Yesterday</div>
          <textarea rows={4} className="w-full border rounded-md px-3 py-2" value={yesterday} onChange={e=>setYesterday(e.target.value)}/>
        </div>
        <div>
          <div className="text-xs text-slate-500">Today</div>
          <textarea rows={4} className="w-full border rounded-md px-3 py-2" value={today} onChange={e=>setToday(e.target.value)}/>
        </div>
        <div>
          <div className="text-xs text-slate-500">Blockers</div>
          <textarea rows={4} className="w-full border rounded-md px-3 py-2" value={blockers} onChange={e=>setBlockers(e.target.value)}/>
        </div>
        <div className="md:col-span-3 text-right"><button className="px-4 py-2 rounded-md bg-blue-600 text-white" onClick={add}>保存</button></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {project.standups.map(s=> (
          <div key={s.id} className="bg-white border rounded-xl p-4">
            <div className="font-semibold mb-2">{s.date}</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-slate-500 mb-1">Yesterday</div><p className="whitespace-pre-wrap">{s.yesterday}</p></div>
              <div><div className="text-slate-500 mb-1">Today</div><p className="whitespace-pre-wrap">{s.today}</p></div>
              <div><div className="text-slate-500 mb-1">Blockers</div><p className="whitespace-pre-wrap">{s.blockers}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KnowledgeBase({ knowledge, setKnowledge }){
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="font-semibold mb-1">PM基礎テキスト（貼り付け）</div>
      <div className="text-sm text-slate-600 mb-2">ここにあなたのPM資料を貼り付け。AIへの問い合わせ時のコンテキストに利用されます。</div>
      <textarea rows={12} className="w-full border rounded-md px-3 py-2" value={knowledge} onChange={e=>setKnowledge(e.target.value)} placeholder={`例
・WBSの作り方
・変更管理プロセス
・RACI表
・品質管理計画
…`} />
      <div className="text-xs text-slate-500 mt-2">* センシティブ情報はマスキング推奨。/api/chat 側で取り扱いに注意。</div>
    </div>
  );
}

function AssistantPanel({ active, knowledge }){
  const [input,setInput] = useState('');
  const [msgs,setMsgs] = useState([]);
  const ref = useRef(null);
  useEffect(()=>{ ref.current?.focus(); }, [active?.id]);

  const send = async()=>{
    if(!input.trim()) return;
    const m = input.trim(); setMsgs(v=>[...v,{role:'user',text:m}]); setInput('');
    const context = active ? { name:active.name, goals:active.goals, stakeholders:active.stakeholders, tasks:active.tasks, risks:active.risks } : null;
    const reply = await chatWithBackend({ message:m, context, knowledge });
    setMsgs(v=>[...v,{role:'assistant',text:reply}]);
  };

  return (
    <div className="sticky top-20 bg-white border rounded-xl p-4 h-[600px] flex flex-col">
      <div className="font-semibold mb-1">AIアシスタント</div>
      <div className="text-sm text-slate-600 mb-2">例：「リリース判定のチェックリスト作って」「このリスクの対策案を」</div>
      <div className="flex-1 border rounded-lg p-3 bg-slate-50 overflow-auto">
        {!msgs.length ? <div className="text-sm text-slate-500">ここにやり取りが表示されます。</div> : (
          <div className="space-y-2">
            {msgs.map((m,i)=> (
              <div key={i} className={m.role==='user'? 'text-right':'text-left'}>
                <div className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role==='user'? 'bg-blue-600 text-white':'bg-white border'}`}>{m.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-start gap-2">
        <textarea ref={ref} rows={3} className="flex-1 border rounded-md px-3 py-2" value={input} onChange={e=>setInput(e.target.value)} placeholder="例: 変更管理フローの説明を簡潔に"/>
        <button onClick={send} className="px-4 py-2 rounded-md bg-slate-900 text-white">送信</button>
      </div>
    </div>
  );
}

function ExportImport({ projects, setProjects, setActiveId }){
  const exportJSON = ()=>{
    const blob = new Blob([JSON.stringify({projects, v:1}, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `pm-copilot-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importJSON = async(file)=>{ const text = await file.text(); const data = JSON.parse(text); if(!Array.isArray(data.projects)) return alert('Invalid file'); setProjects(data.projects); setActiveId(data.projects[0]?.id||''); };
  return (
    <div className="flex items-center gap-2">
      <button className="border px-3 py-1.5 rounded-md" onClick={exportJSON}>Export</button>
      <label className="border px-3 py-1.5 rounded-md cursor-pointer">Import
        <input type="file" accept="application/json" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) importJSON(f);}} />
      </label>
    </div>
  );
}
