export default function HomePageInfo(props) {
  return (
    <section className="homepage-info">
      <button className="homepage-info__close" onClick={props.onClose}>
        Close
      </button>
      <h2>{props.item.title}</h2>
      <p>{props.item.description}</p>
    </section>
  );
}

