import { styled } from '@edtr-io/editor-ui'
import { StatefulPluginEditorProps, StateTypeReturnType } from '@edtr-io/plugin'
import KaTeX from 'katex'
import * as React from 'react'
import { Grid, Col, Row } from 'react-styled-flexboxgrid'

import { terminatorState } from '.'
import { NodeType } from './terminator/00_Declarations'
import { TNode } from './terminator/05_TNode'
import { Frac } from './terminator/15_Frac'
import { Create } from './terminator/30_Interface'

const BlockMathSpan = styled.span({
  display: 'block',
  margin: '1em 0',
  textAlign: 'center'
})

interface SolutionStep {
  formula: TNode
  description: string
}

function describe(type: NodeType): string {
  if (type === 'plus') {
    return 'Addiere'
  }
  if (type === 'minus') {
    return 'Subtrahiere'
  }
  if (type === 'mal') {
    return 'Multipliziere'
  }
  if (type === 'geteilt') {
    return 'Dividiere'
  }
  if (type === 'potenz') {
    return 'Potenziere'
  }
  return 'Rechne'
}

export function TerminatorRenderer(
  props: StatefulPluginEditorProps<typeof terminatorState> & {
    renderIntoExtendedSettings?: (children: React.ReactNode) => React.ReactNode
  }
) {
  const [term, setTerm] = React.useState<TNode | null>(null)
  const [solutionSteps, setSolutionSteps] = React.useState<SolutionStep[]>([])
  const [index, setIndex] = React.useState(1)
  const [error, setError] = React.useState('')

  const [strikeCount, setStrikeCount] = React.useState(0)
  const [resultState, setResultState] = React.useState('none')
  const [showSolution, setShowSolution] = React.useState(false)

  const stateRef = React.useRef(props.state)
  React.useEffect(() => {
    stateRef.current = props.state
  })

  React.useEffect(() => {
    console.log('render')
    let newTerm = null
    try {
      newTerm = Create(createInterfaceOptions(stateRef.current))
    } catch (e) {
      setError('Es gab einen Fehler: ' + e.message)
    }
    if (newTerm && error) setError('')
    if (newTerm) {
      setTerm(newTerm)
      // Ein guter Moment um Lösungswege zu erzeugen...
      let currentStep = newTerm.clone()
      let steps: SolutionStep[] = []
      let currentEvaluable: TNode | null = null
      while (currentStep.type !== 'zahl') {
        // suche nach möglicher Berechnung
        const lastEvaluable = currentEvaluable
        currentEvaluable = null
        currentStep.traverse(node => {
          const l = node.left()
          const r = node.right()
          if (
            !currentEvaluable &&
            l &&
            r &&
            l.type === 'zahl' &&
            r.type === 'zahl'
          ) {
            currentEvaluable = node
          }
        })
        if (currentEvaluable) {
          const ce: TNode = currentEvaluable
          const thisStep = currentStep.clone()
          thisStep.traverse(node => {
            if (ce && node.value === ce.value) {
              node.color = 'blue'
            }
            // @ts-ignore
            if (lastEvaluable !== null && node.value === lastEvaluable.value) {
              node.bold = true
            }
          })

          steps.push({
            formula: thisStep,
            description: describe(ce.type)
          })
          const t = new TNode('zahl', ce.value)
          currentStep = currentStep.replace(ce, t)
        } else {
          throw new Error('Irgendwas ist schiefgelaufen')
        }

        if (!currentEvaluable) {
        } else {
        }
      }
      currentStep.bold = true
      steps.push({
        formula: currentStep,
        description: 'Ergebnis erreicht'
      })
      setSolutionSteps(steps)
    }
  }, [index, stateRef, error])

  const useFracs = props.state.catalog.value.includes('frac')
  const numberRef = React.createRef<HTMLInputElement>()
  const fracWRef = React.createRef<HTMLInputElement>()
  const fracNRef = React.createRef<HTMLInputElement>()
  const fracDRef = React.createRef<HTMLInputElement>()

  function reset() {
    setShowSolution(false)
    if (useFracs) {
      if (fracNRef.current) {
        fracNRef.current.value = ''
      }
      if (fracDRef.current) {
        fracDRef.current.value = ''
      }
      if (fracWRef.current) {
        fracWRef.current.value = ''
      }
    } else {
      if (numberRef.current) {
        numberRef.current.value = ''
      }
    }
  }

  function focus() {
    if (useFracs) {
      if (fracWRef.current) {
        fracWRef.current.focus()
      }
    } else {
      if (numberRef.current) {
        numberRef.current.focus()
      }
    }
  }

  function checkResult() {
    if (resultState === 'none') {
      let result: Frac | null = null
      if (useFracs) {
        // parse frac input
        const w = parseInt(fracWRef.current ? fracWRef.current.value : 'x')
        const n = parseInt(fracNRef.current ? fracNRef.current.value : 'x')
        const d = parseInt(fracDRef.current ? fracDRef.current.value : 'x')
        if (!isNaN(w) && !isNaN(n) && !isNaN(d)) {
          result = new Frac(w).add(new Frac(n, d))
        } else if (!isNaN(n) && !isNaN(d)) {
          result = new Frac(n, d)
        } else if (!isNaN(w)) {
          result = new Frac(w)
        }
        if (!isNaN(d) && result && result.den !== d) {
          alert('Bitte Ergebnis noch kürzen!')
          return
        }
      } else {
        const n = parseInt(numberRef.current ? numberRef.current.value : 'x')
        if (!isNaN(n)) result = new Frac(n)
      }
      if (result) {
        if (term && result.equals(term.value as Frac)) {
          setResultState('success')
          if (strikeCount + 1 === props.state.practiceCount.value) {
            setTimeout(
              () =>
                alert(
                  'Herzlichen Glückwunsch! Du hast diese Fähigkeit gemeistert!'
                ),
              0
            )
          }
          setStrikeCount(strikeCount + 1)
        } else {
          if (document.activeElement) {
            // @ts-ignore
            document.activeElement.blur()
          }
          setResultState('fail')
          setStrikeCount(0)
        }
      } else {
        alert('Bitte Anwort eingeben!')
      }
    } else {
      setIndex(index + 1)
      setResultState('none')
      reset()
      focus()
    }
  }

  return (
    <>
      {props.renderIntoExtendedSettings
        ? props.renderIntoExtendedSettings(
            <TerminatorSettings
              state={props.state}
              inc={() => {
                setIndex(index + 1)
                setResultState('none')
                setStrikeCount(0)
                reset()
              }}
            />
          )
        : null}
      <p>Berechne</p>
      <p>
        {error ? (
          error
        ) : (
          <BlockMathSpan
            dangerouslySetInnerHTML={{
              __html: KaTeX.renderToString(
                '\\displaystyle ' +
                  (term
                    ? resultState === 'none'
                      ? term.toTeX()
                      : term.toTeX() + '\\\\ \\, \\\\ = ' + term.value.toTeX()
                    : 'xxx'),
                {
                  throwOnError: false
                }
              )
            }}
          ></BlockMathSpan>
        )}
      </p>
      {resultState !== 'none' ? (
        <>
          <p style={{ textAlign: 'center' }}>
            <span
              style={{
                color: '#fff',
                borderRadius: '0.25rem',
                backgroundColor:
                  resultState === 'success' ? '#83A617' : '#D9534F',
                fontWeight: 700,
                padding: '0.25em 0.4em',
                fontSize: '75%'
              }}
            >
              {resultState === 'success' ? 'Gut gemacht!' : 'Leider falsch ...'}
            </span>
            <a
              style={{ marginLeft: '2rem', cursor: 'pointer' }}
              onClick={() => {
                setShowSolution(!showSolution)
              }}
            >
              {showSolution ? '▲ Lösungweg verbergen' : '▼ Lösungweg anzeigen'}
            </a>
          </p>
          {showSolution ? (
            <Grid
              fluid
              style={{
                width: '100%',
                marginBottom: '1rem',
                backgroundColor: '#eee'
              }}
            >
              {solutionSteps.map(step => {
                return (
                  <Row>
                    <Col xs={12} sm={9}>
                      <BlockMathSpan
                        dangerouslySetInnerHTML={{
                          __html: KaTeX.renderToString(
                            '\\displaystyle ' + step.formula.toTeX(),
                            {
                              throwOnError: false
                            }
                          )
                        }}
                      ></BlockMathSpan>
                    </Col>
                    <Col xs={12} sm={3}>
                      <span style={{ marginTop: '1.7rem', display: 'block' }}>
                        {step.description}
                      </span>
                    </Col>
                  </Row>
                )
              })}
            </Grid>
          ) : null}
        </>
      ) : null}

      {useFracs ? (
        <table
          style={{
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'center',
            fontSize: 20
          }}
        >
          <tbody>
            <tr>
              <td rowSpan={2}>
                ={' '}
                <input
                  ref={fracWRef}
                  style={{ textAlign: 'center', margin: 3 }}
                  defaultValue=""
                  autoComplete="off"
                  autoCapitalize="none"
                  pattern="[0-9\-]*"
                  type="text"
                  size={3}
                  maxLength={7}
                  onKeyDown={e => {
                    if (e.keyCode === 13) {
                      checkResult()
                      e.stopPropagation()
                      e.preventDefault()
                      return false
                    }
                    return true
                  }}
                />
              </td>
              <td>
                <div style={{ borderBottom: '3px solid black' }}>
                  <input
                    ref={fracNRef}
                    style={{ textAlign: 'center', margin: 3 }}
                    defaultValue=""
                    autoComplete="off"
                    autoCapitalize="none"
                    pattern="[0-9\-]*"
                    type="text"
                    size={3}
                    maxLength={7}
                    onKeyDown={e => {
                      if (e.keyCode === 13) {
                        checkResult()
                        e.stopPropagation()
                        e.preventDefault()
                        return false
                      }
                      return
                    }}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <input
                  ref={fracDRef}
                  style={{ textAlign: 'center', margin: 3 }}
                  defaultValue=""
                  autoComplete="off"
                  autoCapitalize="none"
                  pattern="[0-9]*"
                  type="text"
                  size={3}
                  maxLength={7}
                  onKeyDown={e => {
                    if (e.keyCode === 13) {
                      checkResult()
                      e.stopPropagation()
                      e.preventDefault()
                      return false
                    }
                    return
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p style={{ textAlign: 'center', fontSize: 20 }}>
          ={' '}
          <input
            ref={numberRef}
            style={{ textAlign: 'center' }}
            defaultValue=""
            autoComplete="off"
            autoCapitalize="none"
            pattern="[0-9\-]*"
            type="text"
            size={3}
            maxLength={7}
            onKeyDown={e => {
              if (e.keyCode === 13) {
                checkResult()
                e.stopPropagation()
                e.preventDefault()
                return false
              }
              return
            }}
          />
        </p>
      )}
      <p style={{ textAlign: 'right' }}>
        <button
          onClick={checkResult}
          style={{
            backgroundColor: '#007EC1',
            color: 'white',
            border: '1px solid transparent',
            borderRadius: 2,
            padding: '4px 12px'
          }}
        >
          {resultState === 'none'
            ? 'Prüfen'
            : resultState === 'success'
            ? 'Weiter'
            : 'Neue Aufgabe'}
        </button>
      </p>
      <div
        style={{
          display: 'flex',
          height: '1rem',
          overflow: 'hidden',
          backgroundColor: '#eee',
          borderRadius: '0.25rem',
          marginTop: '1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor:
              strikeCount >= props.state.practiceCount.value
                ? '#95BC1A'
                : '#007EC1',
            width:
              Math.max(
                1,
                Math.round(
                  (strikeCount / props.state.practiceCount.value) * 100
                )
              ) + '%'
          }}
        ></div>
      </div>
      <p>
        Löse <strong>{props.state.practiceCount.value}</strong> Aufgaben am
        Stück, um diese Fähigkeit zu meistern (aktuell {strikeCount}/
        {props.state.practiceCount.value}
        ).
        {/*
        <br /><br /><br />
        <small>
          <a
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setIndex(index + 1)
              if (numberRef.current) {
                numberRef.current.value = ''
                numberRef.current.focus()
              }
            }}
          >
            Reset
          </a>
        </small>
        */}
      </p>
      <p></p>
    </>
  )
}

function createInterfaceOptions(
  state: StateTypeReturnType<typeof terminatorState>
) {
  if (state.catalog.value === 'kopfexotic' && state.size.value > 2) {
    throw new Error('Schnapszahlen unterstützt nur Termlänge 1')
  }
  if (state.catalog.value.includes('frac') && state.power.value > 0) {
    throw new Error('Brüche unterstützen keine Potenzen')
  }
  if (
    state.addition.value +
      state.multiplication.value +
      state.subtraction.value +
      state.division.value +
      state.power.value ===
    0
  ) {
    throw new Error('Bitte gib mindestens eine Rechenart an!')
  }
  if (state.size.value < 0 || state.size.value > 10) {
    throw new Error('Ungültige Termlänge')
  }

  return {
    catalog: state.catalog.value,
    addition: state.addition.value,
    multiplication: state.multiplication.value,
    subtraction: state.subtraction.value,
    division: state.division.value,
    power: state.power.value,
    size: state.size.value,
    negative: state.negative.value,
    decimals: state.decimals.value,
    noMixed: state.noMixed.value
  }
}

// ------------------------------------------------------------

interface TerminatorSettingsProps {
  state: StateTypeReturnType<typeof terminatorState>
  inc: () => void
}

function TerminatorSettings(props: TerminatorSettingsProps) {
  const {
    catalog,
    addition,
    multiplication,
    subtraction,
    division,
    power,
    size,
    negative,
    decimals,
    noMixed,
    practiceCount
  } = props.state
  return (
    <>
      <br />
      <label>
        Voreinstellungen:{' '}
        <select
          defaultValue="none"
          onChange={e => {
            doPreset(e.target.value, props.state)
            props.inc()
          }}
        >
          <option value="none">---</option>
          <option value="p1">Kopfrechnen</option>
          <option value="p2">Terme mit natürlichen Zahlen</option>
          <option value="p3">Negative Zahlen</option>
          <option value="p4">Einstieg Bruchrechnung</option>
          <option value="p5">Dezimalzahlen</option>
          <option value="p0">(leer)</option>
        </select>
      </label>
      <hr />
      <label>
        Zahlenbereich:{' '}
        <select
          value={catalog.value}
          onChange={e => {
            catalog.set(e.target.value)
            props.inc()
          }}
        >
          <option value="kopfeasy">
            natürliche Zahlen bis 100, kein Übertrag
          </option>
          <option value="kopfmedium">natürliche Zahlen bis 100</option>
          <option value="kopfexotic">Schnapszahlen</option>
          <option value="large">große natürliche Zahlen</option>
          <option value="fraceasy">einfache Brüche</option>
          <option value="fracbasic">normale Brüche</option>
        </select>
      </label>
      <br />
      <br />
      <label>
        Termgröße:{' '}
        <input
          type="number"
          min="1"
          max="10"
          value={size.value}
          size={5}
          onChange={e => {
            size.set(parseInt(e.target.value))
            props.inc()
          }}
        />
      </label>{' '}
      <label>
        Negative Zahlen:{' '}
        <select
          value={negative.value}
          onChange={e => {
            negative.set(parseInt(e.target.value))
            props.inc()
          }}
        >
          <option value="0">keine</option>
          <option value="1">wenig</option>
          <option value="2">mittel</option>
          <option value="3">viel</option>
        </select>
      </label>
      <br />
      <br />
      <label>
        Gemeistert bei:{' '}
        <input
          type="number"
          min="1"
          max="100"
          value={practiceCount.value}
          size={5}
          onChange={e => {
            practiceCount.set(parseInt(e.target.value))
            props.inc()
          }}
        />
      </label>
      <hr />
      <label>
        Addition:{' '}
        <select
          value={addition.value}
          onChange={e => {
            addition.set(parseInt(e.target.value))
            props.inc()
          }}
        >
          <option value="0">---</option>
          <option value="1">normal</option>
          <option value="2">viel</option>
          <option value="3">sehr viel</option>
        </select>
      </label>
      {'  '}
      <label>
        Multiplikation:{' '}
        <select
          value={multiplication.value}
          onChange={e => {
            multiplication.set(parseInt(e.target.value))
            props.inc()
          }}
        >
          <option value="0">---</option>
          <option value="1">normal</option>
          <option value="2">viel</option>
          <option value="3">sehr viel</option>
        </select>
      </label>
      <br />
      <label>
        Subtraktion:{' '}
        <select
          value={subtraction.value}
          onChange={e => {
            subtraction.set(parseInt(e.target.value))
            props.inc()
          }}
        >
          <option value="0">---</option>
          <option value="1">normal</option>
          <option value="2">viel</option>
          <option value="3">sehr viel</option>
        </select>
      </label>
      {'  '}
      <label>
        Division:{' '}
        <select
          value={division.value}
          onChange={e => {
            division.set(parseInt(e.target.value))
            props.inc()
          }}
        >
          <option value="0">---</option>
          <option value="1">normal</option>
          <option value="2">viel</option>
          <option value="3">sehr viel</option>
        </select>
      </label>
      {'  '}
      <label>
        Potenz:{' '}
        <select
          value={power.value}
          onChange={e => {
            power.set(parseInt(e.target.value))
            props.inc()
          }}
        >
          <option value="0">---</option>
          <option value="1">normal</option>
          <option value="2">viel</option>
          <option value="3">sehr viel</option>
        </select>
      </label>
      <hr />
      <label>
        <input
          type="checkbox"
          value="dec"
          defaultChecked={decimals.value}
          onChange={e => {
            decimals.set(e.target.checked)
            props.inc()
          }}
        />{' '}
        Erlaube Dezimalzahlen
      </label>{' '}
      <label>
        <input
          type="checkbox"
          value="no_mixed"
          defaultChecked={noMixed.value}
          onChange={e => {
            noMixed.set(e.target.checked)
            props.inc()
          }}
        />{' '}
        Keine gemischten Brüche
      </label>
    </>
  )
}

function doPreset(
  key: string,
  state: StateTypeReturnType<typeof terminatorState>
) {
  if (key === 'p0') {
    state.catalog.set('kopfeasy')
    state.addition.set(1)
    state.multiplication.set(0)
    state.subtraction.set(0)
    state.division.set(0)
    state.power.set(0)
    state.size.set(1)
    state.negative.set(0)
    state.decimals.set(false)
    state.noMixed.set(false)
    state.practiceCount.set(0)
  }
  if (key === 'p1') {
    state.catalog.set('kopfmedium')
    state.addition.set(1)
    state.multiplication.set(1)
    state.subtraction.set(1)
    state.division.set(2)
    state.power.set(3)
    state.size.set(1)
    state.negative.set(0)
    state.decimals.set(false)
    state.noMixed.set(false)
    state.practiceCount.set(10)
  }
  if (key === 'p2') {
    state.catalog.set('kopfeasy')
    state.addition.set(1)
    state.multiplication.set(1)
    state.subtraction.set(1)
    state.division.set(2)
    state.power.set(2)
    state.size.set(4)
    state.negative.set(0)
    state.decimals.set(false)
    state.noMixed.set(false)
    state.practiceCount.set(5)
  }
  if (key === 'p3') {
    state.catalog.set('kopfmedium')
    state.addition.set(1)
    state.multiplication.set(0)
    state.subtraction.set(1)
    state.division.set(0)
    state.power.set(0)
    state.size.set(1)
    state.negative.set(3)
    state.decimals.set(false)
    state.noMixed.set(false)
    state.practiceCount.set(7)
  }
  if (key === 'p4') {
    state.catalog.set('fraceasy')
    state.addition.set(1)
    state.multiplication.set(0)
    state.subtraction.set(0)
    state.division.set(0)
    state.power.set(0)
    state.size.set(1)
    state.negative.set(0)
    state.decimals.set(false)
    state.noMixed.set(false)
    state.practiceCount.set(4)
  }
  if (key === 'p5') {
    state.catalog.set('fracbasic')
    state.addition.set(0)
    state.multiplication.set(1)
    state.subtraction.set(0)
    state.division.set(1)
    state.power.set(0)
    state.size.set(1)
    state.negative.set(3)
    state.decimals.set(true)
    state.noMixed.set(true)
    state.practiceCount.set(3)
  }
}
