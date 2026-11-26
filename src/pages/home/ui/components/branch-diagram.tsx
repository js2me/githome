export const BranchDiagram = () => (
  <div className="home-branch-diagram" aria-hidden="true">
    <div className="home-branch-rail">
      <i className="home-branch-fork" />
      <i className="home-branch-node home-branch-node--start" />
      <i className="home-branch-node home-branch-node--fork" />
      <i className="home-branch-node home-branch-node--commit" />
      <i className="home-branch-node home-branch-node--merge" />
    </div>
  </div>
);
