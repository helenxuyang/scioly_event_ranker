import { useState } from 'react';
import CSVReader from 'react-csv-reader'
import { ExportToCsv } from 'export-to-csv';

// const getColumn = (
//   data: string[][],
//   col: number,
//   filterOut: string
// ) => data
//   .map(row => row[col])
//   .filter(str => !str.toLowerCase().includes(filterOut));

/*
Columns:
Team number | Team name | Event 1 name | Event 2 name | ...
*/

// team num -> team name
type TeamsType = {
  [x: string]: string;
};

type ScoreType = number | 'DQ' | 'NS' | 'P';

// team num -> raw score 
type EventScoresType = {
  [x: string]: ScoreType;
};

// team num -> rank
type EventRanksType = {
  [x: string]: number;
};

// event name -> { team num -> raw score }
type ScoresType = {
  [x: string]: EventScoresType;
};

// event name -> { team num -> rank }
type RanksType = {
  [x: string]: EventRanksType;
};

const calculateRanks = (eventScores: EventScoresType, biggerIsBetter: boolean = true) => {
  const ranks: EventRanksType = {};
  const numericalScoredTeams = Object.keys(eventScores)
    .filter(teamNum => typeof eventScores[teamNum] === 'number')
    .sort((teamA, teamB) => {
      const teamAScore = eventScores[teamA] as number;
      const teamBScore = eventScores[teamB] as number;
      return biggerIsBetter ? (teamBScore - teamAScore) : (teamAScore - teamBScore);
    });

  for (let i = 0; i < numericalScoredTeams.length; i++) {
    ranks[numericalScoredTeams[i]] = i + 1;
  }

  const otherScoredTeams = Object.keys(eventScores)
    .filter(teamNum => typeof eventScores[teamNum] !== 'number');

  const totalTeams = Object.keys(eventScores).length;
  for (let i = 0; i < otherScoredTeams.length; i++) {
    const teamNum = otherScoredTeams[i];
    const score = eventScores[teamNum];
    let rank = totalTeams;
    if (score === 'NS') {
      rank += 1;
    }
    else if (score === 'DQ') {
      rank += 2;
    }
    ranks[teamNum] = rank;
  }

  return ranks;
}

const ScoresImporter = () => {
  const [teams, setTeams] = useState<TeamsType | null>(null);
  const [scores, setScores] = useState<ScoresType | null>(null);
  const [ranks, setRanks] = useState<RanksType | null>(null);
  const [viewRanks, setViewRanks] = useState(false);
  const [exportRanks, setExportRanks] = useState<string[][]>([]);

  const csvOptions = {
    fieldSeparator: ',',
    quoteStrings: '"',
    decimalSeparator: '.',
    useTextFile: false,
    useBom: true,
    filename: 'ranks',
    showColumnHeaders: false
  };

  return <div>
    <CSVReader
      onFileLoaded={
        (data: string[][]) => {

          // const teamNumbers = getColumn(data, 0, 'team num');
          // const teamNames = getColumn(data, 1, 'team name');

          // type TeamNumbers = {
          //   [K in typeof teamNumbers[number]]: string
          // }

          const numRows = data.length;
          const numCols = data[0].length;

          const teamsByNumber: TeamsType = {};
          const scoresByEvent: ScoresType = {};

          // --- GET TEAM NUMS ---
          // 2nd row and beyond
          for (let i = 1; i < numRows; i++) {
            teamsByNumber[data[i][0]] = data[i][1];
          }

          // --- GET SCORES ---
          // 3rd col and beyond
          for (let i = 2; i < numCols; i++) {
            const eventName = data[0][i];
            const eventScores: EventScoresType = {};
            // 2nd row and beyond
            for (let j = 1; j < numRows; j++) {
              const teamNum = data[j][0];
              let teamScore = data[j][i];
              if (teamScore === '') {
                teamScore = 'NS';
              }
              const parsedScore = parseFloat(teamScore);
              eventScores[teamNum] = Number.isNaN(parsedScore) ? teamScore as ScoreType : parsedScore;
            }
            scoresByEvent[eventName] = eventScores;
          }
          setScores(scoresByEvent);
          setTeams(teamsByNumber);

          const allRanks: RanksType = {};
          for (const eventName of Object.keys(scoresByEvent)) {
            const eventRanks = calculateRanks(scoresByEvent[eventName], true);
            allRanks[eventName] = eventRanks;
          }
          setRanks(allRanks);
          // console.log(scoresByEvent);
          // console.log(allRanks);

          const exportData: string[][] = [];
          exportData.push(data[0]);
          for (const teamNum of Object.keys(teamsByNumber)) {
            const teamRanks = [teamNum, teamsByNumber[teamNum]];
            for (const eventName of Object.keys(scoresByEvent)) {
              teamRanks.push(allRanks[eventName][teamNum].toString());
            }
            exportData.push(teamRanks);
          }
          console.log(exportData);
          setExportRanks(exportData);
        }
      }
    />

    {scores && teams && ranks &&
      <div>
        <button onClick={() => {
          setViewRanks(val => !val);
        }}>{`View ${viewRanks ? 'scores' : 'ranks'}`}</button>
        <table>
          <thead>
            <tr>
              <th>Team number</th>
              <th>Team name</th>
              {Object.keys(scores).map(eventName => <th key={eventName}>{eventName}</th>)}
            </tr>
          </thead>
          <tbody>
            {Object.keys(teams).map(teamNum => {
              return <tr key={teamNum}>
                <td>{teamNum}</td>
                <td>{teams[teamNum]}</td>
                {Object.entries(scores).map(([eventName, eventScores]) => {
                  const uniqueKey = `${teamNum}${eventName}`;
                  return <td key={uniqueKey}>{viewRanks ? ranks[eventName][teamNum] : eventScores[teamNum]}</td>;
                })}
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    }

    {ranks && exportRanks.length > 0 && <button onClick={() => {
      const csvExporter = new ExportToCsv(csvOptions);

      csvExporter.generateCsv(exportRanks);
    }}>Export Ranks</button>}
  </div>
}

export default ScoresImporter;