import { useId, useState } from 'react'
import { cn } from '../../../shared/lib/cn'
import { Textarea } from '../../../shared/ui/Textarea'
import { MODULE_DETAIL_TEXTS, RULE_MAX_LENGTH, RULE_MIN_LENGTH } from '../constants'

export type BehaviorRuleFieldProps = {
  value: string
  onChange: (value: string) => void
}

export function BehaviorRuleField({ value, onChange }: BehaviorRuleFieldProps) {
  const fieldId = useId()
  const hintId = useId()
  const [isTouched, setIsTouched] = useState(false)
  const isTooShort = isTouched && value.trim().length < RULE_MIN_LENGTH

  return (
    <section className="mt-6">
      <label htmlFor={fieldId} className="block text-sm font-semibold text-gray-900">
        {MODULE_DETAIL_TEXTS.ruleTitle}
      </label>
      <Textarea
        id={fieldId}
        rows={3}
        className={cn('mt-3', isTooShort && 'ring-1 ring-red-500')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setIsTouched(true)}
        placeholder={MODULE_DETAIL_TEXTS.rulePlaceholder}
        minLength={RULE_MIN_LENGTH}
        maxLength={RULE_MAX_LENGTH}
        aria-invalid={isTooShort}
        aria-describedby={hintId}
      />
      <p id={hintId} className={cn('mt-1 text-xs', isTooShort ? 'text-red-600' : 'text-gray-400')}>
        {MODULE_DETAIL_TEXTS.ruleMinLengthHint}
      </p>
    </section>
  )
}
