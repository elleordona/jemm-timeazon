export default function HomePageCard(props) {
  return (
    <div className="homepage-card" onClick={props.onSelect}>
      <img src={props.image} alt={props.title} />
      <h3>{props.title}</h3>
      <p>{props.description}</p>
    </div>
  );
}

