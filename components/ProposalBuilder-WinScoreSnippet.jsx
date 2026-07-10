const [winScore, setWinScore] = useState(null);

async function refreshWinScore(userId, contract) {
  const score = await proposalBuilderIntegration.calculateWinScore(userId, contract);
  setWinScore(score);
}
