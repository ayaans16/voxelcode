"use client";

import { useState } from "react";
import type { Problem } from "@/problems/schema";
import type { Session } from "@/engine/session";
import { evaluateCheckpoint } from "@/problems/checkpoint";
import { patternLabel } from "@/engine/patterns";
import { DEFAULT_GROWTH, type GrowthConstants } from "@/engine/constants";
import { PixelIcon } from "./PixelIcon";

interface Props {
  problem: Problem;
  session: Session;
  growth?: GrowthConstants;
  onAnswer: (answer: { pattern: string; time: string; space: string; correct: boolean }) => void;
}

function Choice({ name, options, value, onChange, format = (s: string) => s, disabled }: { name: string; options: readonly string[]; value: string; onChange: (v: string) => void; format?: (s: string) => string; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          disabled={disabled}
          onClick={() => onChange(o)}
          className={
            "btn px-2 py-1 text-[11px] font-normal " + (value === o ? "btn-on" : "")
          }
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

export function CheckpointCard({ problem, session, growth = DEFAULT_GROWTH, onAnswer }: Props) {
  const cp = problem.approachCheckpoint;
  const [pattern, setPattern] = useState("");
  const [time, setTime] = useState("");
  const [space, setSpace] = useState("");
  const answered = session.checkpoint !== "none";
  const answer = session.checkpointAnswer;
  const verdict = answered && answer ? evaluateCheckpoint(problem, answer) : null;
  const ready = pattern && time && space;

  return (
    <section aria-label="Approach checkpoint" className="block">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="badge">Approach checkpoint</span>
        <span className="text-[11px] text-dim">
          {answered ? (session.checkpoint === "correct" ? `+${Math.round(growth.checkpointCorrect * 100)}% earned` : `+${Math.round(growth.checkpointWrong * 100)}% earned`) : `up to +${Math.round(growth.checkpointCorrect * 100)}%`}
        </span>
      </div>
      <div className="space-y-3 p-3 text-[12px]">
        {!answered ? (
          <>
            <p className="text-mute">Before or while you code: which pattern fits, and what will it cost?</p>
            <fieldset className="space-y-1.5">
              <legend className="text-dim">Pattern</legend>
              <Choice name="Pattern" options={cp.patternOptions} value={pattern} onChange={setPattern} format={patternLabel} />
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-dim">Time</legend>
              <Choice name="Time complexity" options={cp.complexity.time} value={time} onChange={setTime} />
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-dim">Space</legend>
              <Choice name="Space complexity" options={cp.complexity.space} value={space} onChange={setSpace} />
            </fieldset>
            <button
              type="button"
              disabled={!ready}
              onClick={() => {
                const v = evaluateCheckpoint(problem, { pattern, time, space });
                onAnswer({ pattern, time, space, correct: v.correct });
              }}
              className="btn btn-primary w-full px-3 py-1.5"
            >
              Check my approach
            </button>
          </>
        ) : (
          <>
            <p className={`flex items-center gap-2 font-bold ${session.checkpoint === "correct" ? "text-pass" : "text-warn"}`}>
              <PixelIcon name={session.checkpoint === "correct" ? "check" : "spark"} px={2} />
              {session.checkpoint === "correct" ? "Right on. Your tree got a growth burst." : "Not quite, and that is fine: you still grew."}
            </p>
            {verdict && (
              <ul className="space-y-1 text-mute">
                <li>
                  Pattern: <span className="text-ink">{patternLabel(cp.correctPattern)}</span> {verdict.patternOk ? "(you got it)" : answer && `(you chose ${patternLabel(answer.pattern)})`}
                </li>
                <li>
                  Time: <span className="text-ink">{cp.complexity.correctTime}</span> {verdict.timeOk ? "(you got it)" : answer && `(you chose ${answer.time})`}
                </li>
                <li>
                  Space: <span className="text-ink">{cp.complexity.correctSpace}</span> {verdict.spaceOk ? "(you got it)" : answer && `(you chose ${answer.space})`}
                </li>
              </ul>
            )}
            <p className="border-l-2 border-accent pl-3 text-mute">{cp.explanation}</p>
          </>
        )}
      </div>
    </section>
  );
}
