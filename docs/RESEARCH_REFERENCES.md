# Research References and Attribution

This is a build specification and literature starting point, not a completed literature review. Verify bibliographic details before submitting a formal report.

## Course alignment

The supplied NMIMS Artificial Intelligence 2026–27 course policy lists BFS, DFS, Uniform Cost Search, Greedy Best-First Search, A*, hill climbing, Genetic Algorithm, and adversarial search including Minimax and Alpha-Beta pruning in Unit 2. Its course outcomes include heuristic/search strategies and game playing. This project emphasizes the techniques that naturally fit Quoridor rather than forcing unrelated algorithms into the same agent.

## Main repository examined as inspiration

- Gorisanson, **Quoridor AI based on Monte Carlo tree search**: https://github.com/gorisanson/quoridor-ai
- The repository README describes MCTS for Quoridor and reports that heuristics improved its results. Its examples include candidate-wall filtering, shortest-path-biased rollouts, and adjustments to search behavior late in the game.
- Use this repository to understand the problem and cite it in the report. **Do not clone it as the submitted implementation or copy its source code into this project.** The implementation in this kit is intended to be original and primarily syllabus-aligned.

## Published work named by the repository

- Victor Massagué Respall, Joseph Alexander Brown, and Hamma Aslam, **“Monte Carlo Tree Search for Quoridor” (2018)**. The reference appears in the above repository README. Verify the final citation metadata from the paper/publisher before including it in an academic bibliography.
- Levente Kocsis and Csaba Szepesvári, **“Bandit Based Monte-Carlo Planning” (2006)**. Commonly associated with UCT; verify publisher/proceedings metadata before final citation.
- Peter Auer, Nicolò Cesa-Bianchi, and Paul Fischer, **“Finite-time Analysis of the Multiarmed Bandit Problem” (2002)**. Commonly cited in the context of UCB; verify final citation details.

## Additional rules reference

- Quoridor rules reference: https://quoridor.fr/en/rules/
- A written rules guide with standard two-player movement and wall constraints: https://www.playquoridor.online/about

Use a primary rules source if available to the student. Online rule summaries can differ in how they describe edge cases; state the exact adopted rules in the report and make the code/tests consistent.

## Attribution requirements

- Cite the Gorisanson repository if its design ideas, rollout heuristics, or reported comparisons are discussed.
- Do not claim the new implementation is the same as that repository's agent.
- Do not present the repository's reported win rates as results for this project.
- Include relevant software/library licenses when distributing the completed project.
- This spec's algorithms are described independently at a design level; the build agent should create original code and should not paste third-party implementation code.
