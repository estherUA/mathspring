package edu.umass.ckc.wo.tutor.intervSel2;

import edu.umass.ckc.wo.content.TopicIntro;
import edu.umass.ckc.wo.db.DbTopics;
import edu.umass.ckc.wo.event.SessionEvent;
import edu.umass.ckc.wo.event.tutorhut.ContinueNextProblemInterventionEvent;
import edu.umass.ckc.wo.event.tutorhut.InputResponseNextProblemInterventionEvent;
import edu.umass.ckc.wo.event.tutorhut.NextProblemEvent;
import edu.umass.ckc.wo.interventions.NextProblemIntervention;
import edu.umass.ckc.wo.interventions.TopicIntroIntervention;
import edu.umass.ckc.wo.smgr.SessionManager;
import edu.umass.ckc.wo.tutor.model.TopicModel;
import edu.umass.ckc.wo.tutor.pedModel.PedagogicalModel;
import edu.umass.ckc.wo.tutor.probSel.PedagogicalModelParameters;
import edu.umass.ckc.wo.tutor.probSel.TopicModelParameters;
import edu.umass.ckc.wo.tutor.response.Response;
import edu.umass.ckc.wo.tutormeta.Intervention;
import edu.umass.ckc.wo.tutormeta.PedagogicalMoveListener;
import org.jdom.Element;

/**
 * Created with IntelliJ IDEA.
 * User: david
 * Date: 3/20/15
 * Time: 11:53 AM
 * To change this template use File | Settings | File Templates.
 */
public class TopicIntroIS extends InterventionSelector {
    TopicModel topicModel;
    TopicModelParameters tmParams;
    TopicModelParameters.frequency freq;
    PedagogicalMoveListener pedMoveListener;

    public TopicIntroIS(SessionManager smgr) {
        super(smgr);

    }

    @Override
    public void init(SessionManager smgr, PedagogicalModel pedagogicalModel) {
//        super.init(smgr,pedagogicalModel);
        this.pedagogicalModel=pedagogicalModel;
        topicModel = (TopicModel) pedagogicalModel.getLessonModel();
        tmParams = topicModel.getTmParams();
        pedMoveListener = topicModel.getPedagogicalMoveListener();
        configure();
    }

    // The intervention must be defined with <topicIntroFrequecy> in the config.
    // Valid values for this are: never, oncePerSession, always.  If not provided a default is used
    // as defined in the  TopicModelParameters via PedagogicalModelParameters .
    private void configure () {
        Element config = this.getConfigXML();
        Element freqElt = config.getChild("topicIntroFrequency");
        String freqstr = null;
        if (freqElt != null)
            freqstr = freqElt.getTextTrim();
        this.freq = PedagogicalModelParameters.convertTopicIntroFrequency(freqstr);

    }

    @Override
    // This makes sure the topic intro hasn't been seen
    public Intervention selectIntervention(SessionEvent e) throws Exception {
        TopicIntro intro=null;
        // Note additional conditions are checked and set in the TopicModel's TopicSelector class which knows
        // how to find a topic intro for a given topic.
        if  (!studentState.isTopicIntroShown())  {
            // additional conditions checked in method below
            intro = getTopicIntro(studentState.getCurTopic());
            studentState.setTopicIntroShown(true);
        }
        return intro;
    }

//
//    protected TopicIntro getTopicIntro (int curTopic) throws Exception {
//        // all checking of conditions for display of intro is done in getTopicIntro
//        return topicModel.getTopicIntro(curTopic);
//    }

    // TopicIntros being returned depends on the parameters
    public TopicIntro getTopicIntro(int curTopic) throws Exception {
        // if it should always be shown,  show it.
        if (this.freq == TopicModelParameters.frequency.always ) {
            // if it hasn't been seen in this session, store that it has.
            if (!smgr.getStudentState().isTopicIntroSeen(curTopic) )  {
                smgr.getStudentState().addTopicIntrosSeen(curTopic);
            }
            TopicIntro intro = DbTopics.getTopicIntro(smgr.getConnection(), curTopic);
            this.pedMoveListener.lessonIntroGiven(intro); // inform pedagogical move listeners that an intervention is given
            return intro;

        }
        else if (this.freq == TopicModelParameters.frequency.oncePerSession &&
                !smgr.getStudentState().isTopicIntroSeen(curTopic)) {
            smgr.getStudentState().addTopicIntrosSeen(curTopic);
            TopicIntro intro = DbTopics.getTopicIntro(smgr.getConnection(), curTopic);
            this.pedMoveListener.lessonIntroGiven(intro); // inform pedagogical move listeners that an intervention is given
            return intro;
        }

        return null;
    }






}
